import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n";
import { needsClientTranslation } from "@/lib/translate/detect-source";
import { useClientTranslation } from "@/providers/ClientTranslationProvider";

export function useAutoClientTranslation(
  text: string,
  locale: Locale,
  enabled = true
) {
  const { translate } = useClientTranslation();
  const rootRef = useRef<unknown>(null);
  const [active, setActive] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<Locale | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const shouldTranslate = enabled && needsClientTranslation(text, locale);

  useEffect(() => {
    if (!shouldTranslate) return;
    const timer = setTimeout(() => setActive(true), 0);
    return () => clearTimeout(timer);
  }, [shouldTranslate, text]);

  useEffect(() => {
    if (!shouldTranslate || !active) return;
    if (translated || loading || failed) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void translate(text, locale)
      .then((result) => {
        if (cancelled) return;
        if (!result?.translated) {
          setFailed(true);
          return;
        }
        setTranslated(result.translated);
        setSourceLang(result.sourceLang);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldTranslate, active, translate, text, locale, translated, loading, failed]);

  useEffect(() => {
    setTranslated(null);
    setSourceLang(null);
    setLoading(false);
    setFailed(false);
    setShowOriginal(false);
    setActive(false);
  }, [text, locale]);

  const displayText =
    shouldTranslate && translated && !showOriginal ? translated : text;

  return {
    rootRef,
    shouldTranslate,
    displayText,
    translated,
    sourceLang,
    loading,
    failed,
    showOriginal,
    setShowOriginal,
  };
}
