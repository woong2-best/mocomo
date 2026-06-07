"use client";

import { useEffect } from "react";

/** 호스트 스튜디오 체류 중 lastSeenAt 갱신 — 앱/탭을 닫으면 중단되어 24h 후 자동 종료 */
export function LiveHostPresenceSync({
  channelId,
  enabled,
}: {
  channelId: string;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function ping() {
      try {
        await fetch(`/api/live/${channelId}/presence`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        /* ignore */
      }
    }

    void ping();
    const id = setInterval(() => {
      if (!cancelled) void ping();
    }, 25_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [channelId, enabled]);

  return null;
}
