"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WATERMARK_MIN_VIEW_SECONDS } from "@/lib/watermark/config";

type Options = {
  /** Wall-clock timer after mount. Omit for playback-only (video). */
  autoAfterMs?: number;
};

/**
 * Forensic sessions start only after the viewer has the media open for at least
 * WATERMARK_MIN_VIEW_SECONDS (default 1s).
 */
export function useForensicViewReady(active: boolean, resetKey: string, options?: Options) {
  const [ready, setReady] = useState(false);
  const firedRef = useRef(false);
  const autoAfterMs = options?.autoAfterMs;

  useEffect(() => {
    setReady(false);
    firedRef.current = false;
  }, [active, resetKey]);

  const markViewReady = useCallback(() => {
    if (!active || firedRef.current) return;
    firedRef.current = true;
    setReady(true);
  }, [active]);

  useEffect(() => {
    if (!active || firedRef.current || autoAfterMs == null) return;
    const t = setTimeout(() => markViewReady(), autoAfterMs);
    return () => clearTimeout(t);
  }, [active, autoAfterMs, markViewReady, resetKey]);

  return { viewReady: ready, markViewReady };
}

export function forensicViewAutoMs(): number {
  return WATERMARK_MIN_VIEW_SECONDS * 1000;
}

export function forensicPlaybackReady(currentTime: number): boolean {
  return currentTime >= WATERMARK_MIN_VIEW_SECONDS;
}
