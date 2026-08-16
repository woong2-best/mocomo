"use client";

import { useEffect, useRef } from "react";

/** 후원 합계·TOP·최근 후원 알림 — 2.5초 폴링 */
export function LiveStudioStatsSync({
  channelId,
  onStats,
}: {
  channelId: string;
  onStats: (data: {
    tipTotalKrw: number;
    cheerTotalCp?: number;
    combinedGoalTotal?: number;
    tipRanking: { username: string; amount: number }[];
    recentTips: { id: string; amount: number; message: string | null; username: string; at: number }[];
    donationAlertsOnStream?: boolean;
  }) => void;
}) {
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;
  const sinceRef = useRef(Date.now() - 3000);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const since = sinceRef.current;
        const res = await fetch(`/api/live/${channelId}/stats?since=${since}`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = await res.json();
        if (cancelled || !res.ok || !body.ok) return;
        sinceRef.current = typeof body.serverTime === "number" ? body.serverTime : Date.now();
        onStatsRef.current({
          tipTotalKrw: body.tipTotalKrw ?? 0,
          cheerTotalCp: body.cheerTotalCp ?? 0,
          combinedGoalTotal: body.combinedGoalTotal ?? body.tipTotalKrw ?? 0,
          tipRanking: body.tipRanking ?? [],
          recentTips: body.recentTips ?? [],
          donationAlertsOnStream: body.donationAlertsOnStream,
        });
      } catch {
        /* ignore */
      }
    }

    tick();
    const id = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId]);

  return null;
}
