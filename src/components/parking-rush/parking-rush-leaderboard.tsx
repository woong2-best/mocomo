"use client";

import { useEffect, useState } from "react";
import { RANK_TIER_LABELS, type RankTier } from "@/lib/minigames/parking-rush-logic";

type Entry = {
  rank: number;
  userId: string;
  username: string;
  score: number;
  tier: RankTier;
  levelName: string;
  mode: string;
  parked: boolean;
};

export function ParkingRushLeaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/minigames/parking-rush/leaderboard?limit=10")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-xs text-muted-foreground">랭킹 불러오는 중…</p>;
  if (!entries.length) {
    return <p className="text-center text-xs text-muted-foreground">아직 기록이 없습니다.</p>;
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 overflow-hidden">
      <div className="bg-cyan-950/40 px-4 py-2 text-sm font-semibold">주차 러쉬 랭킹</div>
      <ul className="divide-y divide-white/5">
        {entries.map((e) => (
          <li key={`${e.userId}-${e.rank}`} className="flex items-center gap-2 px-4 py-2 text-sm">
            <span className="w-6 font-bold text-cyan-300">{e.rank}</span>
            <span className="flex-1 truncate">{e.username}</span>
            <span className="text-yellow-300 tabular-nums">{e.score.toLocaleString()}</span>
            <span className="text-[10px] text-violet-300 hidden sm:inline">{RANK_TIER_LABELS[e.tier]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
