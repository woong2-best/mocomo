"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";
import { useClientTranslationOptional } from "@/components/providers/client-translation-provider";
import type { PostTranslateInto } from "@/lib/client-translate/opus-mt-pairs";

export function useAutoClientTranslation(text: string, target: PostTranslateInto) {
  const clientTranslation = useClientTranslationOptional();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [requested, setRequested] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const shouldTranslate = needsClientTranslation(text, target);

  const requestTranslation = useCallback(() => {
    if (!shouldTranslate) return;
    setFailed(false);
    setRequested(true);
  }, [shouldTranslate]);

  useEffect(() => {
    if (!shouldTranslate || !requested || !clientTranslation || translated) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void clientTranslation
      .translate(text, target)
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
        if (cancelled) return;
        setFailed(true);
        setRequested(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldTranslate, requested, clientTranslation, text, target, translated]);

  useEffect(() => {
    setTranslated(null);
    setSourceLang(null);
    setLoading(false);
    setFailed(false);
    setShowOriginal(false);
    setRequested(false);
  }, [text, target]);

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
    requestTranslation,
  };
}
