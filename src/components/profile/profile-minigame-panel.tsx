"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

type Stats = {
  totalMatches: number;
  ratings: {
    gameId: string;
    gameName: string;
    mmr: number;
    tierLabel: string;
    wins: number;
    losses: number;
  }[];
  achievements: { unlocked: number; total: number };
};

export function ProfileMinigamePanel({ username }: { username: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void fetch(`/api/minigames/stats?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ratings) setStats(d);
      });
  }, [username]);

  if (!stats || stats.ratings.length === 0) return null;

  return (
    <Card className="border border-folk-cobalt/15">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-folk-terracotta" />
            미니게임
          </h3>
          <Link href="/games/history" className="text-[10px] text-muted-foreground hover:underline">
            전적
          </Link>
        </div>
        <ul className="space-y-1.5 text-xs">
          {stats.ratings.slice(0, 4).map((r) => (
            <li key={r.gameId} className="flex justify-between gap-2">
              <span className="text-muted-foreground truncate">{r.gameName}</span>
              <span className="font-mono shrink-0">
                {r.tierLabel} · {r.mmr}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-muted-foreground">
          업적 {stats.achievements.unlocked}/{stats.achievements.total}
        </p>
      </CardContent>
    </Card>
  );
}
