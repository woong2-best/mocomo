"use client";

import { useEffect } from "react";

/** 영상 통화 중 화면 꺼짐·백그라운드로 인한 끊김 완화 */
export function useCallWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        if (document.visibilityState !== "visible") return;
        if (lock && !lock.released) return;
        lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => {
          lock = null;
        });
      } catch {
        /* unsupported or low battery */
      }
    }

    acquire();

    const onVisible = () => {
      if (!cancelled) acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [enabled]);
}
