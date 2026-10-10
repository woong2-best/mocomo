"use client";

import { useEffect, useRef, useState } from "react";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";
import { useClientTranslationOptional } from "@/components/providers/client-translation-provider";
import type { PostTranslateInto } from "@/lib/client-translate/opus-mt-pairs";

export function useAutoClientTranslation(text: string, target: PostTranslateInto) {
  const clientTranslation = useClientTranslationOptional();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const shouldTranslate = needsClientTranslation(text, target);

  useEffect(() => {
    if (!shouldTranslate) return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldTranslate, text]);

  useEffect(() => {
    if (!shouldTranslate || !visible || !clientTranslation) return;
    if (translated || loading || failed) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void clientTranslation
      .translate(text, target)
      .then((result) => {
        if (cancelled) return;
        if (!result?.translated) {
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
  }, [
    shouldTranslate,
    visible,
    clientTranslation,
    text,
    target,
    translated,
    loading,
    failed,
  ]);

  useEffect(() => {
    setTranslated(null);
    setSourceLang(null);
    setLoading(false);
    setFailed(false);
    setShowOriginal(false);
    setVisible(false);
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
  };
}
