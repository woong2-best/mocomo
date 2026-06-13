"use client";

import { useEffect, useState } from "react";

type Entry = {
  rank: number;
  userId: string;
  username: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  chartTitle: string;
  mode: string;
};

export function PianoRushLeaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/minigames/piano-rush/leaderboard?limit=10")
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
    <div className="rounded-xl border border-violet-500/20 overflow-hidden">
      <div className="bg-violet-950/40 px-4 py-2 text-sm font-semibold">피아노 러쉬 랭킹</div>
      <ul className="divide-y divide-white/5">
        {entries.map((e) => (
          <li key={`${e.userId}-${e.rank}`} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="w-6 font-bold text-violet-300">{e.rank}</span>
            <span className="flex-1 truncate">{e.username}</span>
            <span className="text-yellow-300 tabular-nums">{e.score.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground w-12 text-right">{e.accuracy}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
