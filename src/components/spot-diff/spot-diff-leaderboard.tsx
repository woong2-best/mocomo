"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatSpotTime } from "@/lib/minigames/spot-diff-logic";

type Entry = {
  rank: number;
  userId: string;
  username: string;
  puzzlesCleared: number;
  totalScore: number;
  elapsedMs: number;
  playStyle: string;
};

export function SpotDiffLeaderboard({ limit = 10 }: { limit?: number }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/minigames/spot-diff/leaderboard?limit=${limit}`)
      .then((r) => r.json())
      .then((data: { entries?: Entry[] }) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          무한 모드 · 클리어 랭킹
        </h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">불러오는 중…</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">아직 기록이 없습니다. 무한 모드로 첫 기록을 남겨 보세요!</p>
        ) : (
          <ol className="space-y-1.5 text-xs">
            {entries.map((e) => (
              <li key={`${e.userId}-${e.rank}`} className="flex justify-between gap-2 border-b border-border/50 pb-1">
                <span>
                  <strong>{e.rank}.</strong> {e.username} · {e.puzzlesCleared}판
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {e.totalScore}점 · {formatSpotTime(e.elapsedMs)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
