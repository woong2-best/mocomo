"use client";

import { useEffect } from "react";
import { useClientTranslation } from "@/components/providers/client-translation-provider";
import { usePostTranslate } from "@/components/providers/post-translate-provider";
import { POST_TRANSLATE_OFF } from "@/lib/client-translate/opus-mt-pairs";

/** Preloads the likely Opus-MT pair after first paint so the first click is inference, not a download. */
export function ClientTranslationWarmup() {
  const { warmUp, loadState } = useClientTranslation();
  const { preference } = usePostTranslate();

  useEffect(() => {
    if (loadState.status !== "idle") return;
    if (preference === POST_TRANSLATE_OFF) return;
    const id = window.setTimeout(() => warmUp(preference), 800);
    return () => window.clearTimeout(id);
  }, [warmUp, loadState.status, preference]);

  return null;
}
