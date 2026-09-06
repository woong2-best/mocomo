"use client";

import { useEffect } from "react";
import { useClientTranslation } from "@/components/providers/client-translation-provider";

/** Preloads the NLLB model in the background after first paint. */
export function ClientTranslationWarmup() {
  const { warmUp, loadState } = useClientTranslation();

  useEffect(() => {
    if (loadState.status !== "idle") return;
    const id = window.setTimeout(() => warmUp(), 1200);
    return () => window.clearTimeout(id);
  }, [warmUp, loadState.status]);

  return null;
}
