"use client";

import { useEffect, useRef } from "react";

/** 후원 합계·TOP·최근 후원 알림 폴링 */
export function LiveStudioStatsSync({
  channelId,
  onStats,
}: {
  channelId: string;
  onStats: (data: {
    tipTotalKrw: number;
    tipRanking: { username: string; amount: number }[];
    recentTips: { id: string; amount: number; message: string | null; username: string; at: number }[];
  }) => void;
}) {
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/live/${channelId}/stats`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = await res.json();
        if (cancelled || !res.ok || !body.ok) return;
        onStatsRef.current({
          tipTotalKrw: body.tipTotalKrw ?? 0,
          tipRanking: body.tipRanking ?? [],
          recentTips: body.recentTips ?? [],
        });
      } catch {
        /* ignore */
      }
    }

    tick();
    const id = setInterval(tick, 18000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId]);

  return null;
}
