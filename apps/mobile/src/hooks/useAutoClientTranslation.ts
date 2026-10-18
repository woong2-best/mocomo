import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/i18n";
import { needsClientTranslation } from "@/lib/translate/detect-source";
import { useClientTranslation } from "@/providers/ClientTranslationProvider";

export function useAutoClientTranslation(
  text: string,
  locale: Locale,
  enabled = true
) {
  const { translate } = useClientTranslation();
  const [requested, setRequested] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<Locale | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const shouldTranslate = enabled && needsClientTranslation(text, locale);

  const requestTranslation = useCallback(() => {
    if (!shouldTranslate) return;
    setFailed(false);
    setRequested(true);
  }, [shouldTranslate]);

  useEffect(() => {
    setTranslated(null);
    setSourceLang(null);
    setLoading(false);
    setFailed(false);
    setShowOriginal(false);
    setRequested(false);
  }, [text, locale]);

  useEffect(() => {
    if (!shouldTranslate || !requested || translated) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void translate(text, locale)
      .then((result) => {
        if (cancelled) return;
        if (!result?.translated) {
          setFailed(true);
          setRequested(false);
          return;
        }
        setTranslated(result.translated);
        setSourceLang(result.sourceLang);
        setShowOriginal(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setRequested(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldTranslate, requested, translate, text, locale, translated]);

  const displayText =
    shouldTranslate && translated && !showOriginal ? translated : text;

  return {
    shouldTranslate,
    displayText,
    translated,
    sourceLang,
    loading,
    failed,
    showOriginal,
    setShowOriginal,
    requestTranslation,
  };
}
