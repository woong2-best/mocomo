"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";
import { useClientTranslationOptional } from "@/components/providers/client-translation-provider";
import type { PostTranslateInto } from "@/lib/client-translate/opus-mt-pairs";

export function useAutoClientTranslation(text: string, target: PostTranslateInto) {
  const clientTranslation = useClientTranslationOptional();
  const lookup = clientTranslation?.lookup;
  const prefetch = clientTranslation?.prefetch;
  const translate = clientTranslation?.translate;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
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
    setTranslated(null);
    setSourceLang(null);
    setLoading(false);
    setFailed(false);
    setShowOriginal(false);
    setRequested(false);
    setVisible(false);
  }, [text, target]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !shouldTranslate) return;

    const markVisible = () => setVisible(true);
    if (el.getBoundingClientRect().top < window.innerHeight + 240) markVisible();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) markVisible();
      },
      { rootMargin: "240px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldTranslate, text]);

  useEffect(() => {
    if (!shouldTranslate || !lookup) return;

    let cancelled = false;
    void lookup(text, target).then((result) => {
      if (cancelled || !result?.translated) return;
      setTranslated(result.translated);
      setSourceLang(result.sourceLang);
      setRequested(true);
      setShowOriginal(false);
    });

    return () => {
      cancelled = true;
    };
  }, [shouldTranslate, lookup, text, target]);

  useEffect(() => {
    if (!visible || !shouldTranslate || !prefetch || translated) return;
    prefetch(text, target);
  }, [visible, shouldTranslate, prefetch, text, target, translated]);

  useEffect(() => {
    if (!shouldTranslate || !requested || !translate || translated) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void translate(text, target, 2)
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
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error(
          "[client-translate] request failed",
          error instanceof Error ? error.message : "error"
        );
        setFailed(true);
        setRequested(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldTranslate, requested, translate, text, target, translated]);

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
