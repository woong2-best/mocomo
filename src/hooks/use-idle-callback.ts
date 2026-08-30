"use client";

import { useEffect } from "react";

/** Run after first paint / when the main thread is idle — avoids competing with navigation. */
export function useIdleCallback(effect: () => void | (() => void), deps: readonly unknown[]) {
  useEffect(() => {
    let cancelled = false;
    let cleanup: void | (() => void);

    const run = () => {
      if (cancelled) return;
      cleanup = effect();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
        cleanup?.();
      };
    }

    const timer = setTimeout(run, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, deps);
}
