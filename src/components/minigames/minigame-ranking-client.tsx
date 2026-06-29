"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllMinigames } from "@/lib/minigames/registry";
import { TIER_LABELS } from "@/lib/minigames/mmr";
import type { MinigameTier } from "@/lib/minigames/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

type Entry = {
  rank: number;
  userId: string;
  username: string;
  mmr: number;
  tier: string;
  wins: number;
  losses: number;
};

export function MinigameRankingClient({
  defaultPeriod = "all",
  compact = false,
}: {
  defaultPeriod?: "all" | "season";
  compact?: boolean;
}) {
  const { isNativeApp } = useClientPlatform();
  const games = getAllMinigames().filter((g) => g.id !== "sketch-quiz");
  const [gameId, setGameId] = useState(games[0]?.id ?? "omok");
  const [period, setPeriod] = useState<"all" | "season">(defaultPeriod);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [seasonName, setSeasonName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/minigames/ranking?gameId=${gameId}&period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries ?? []);
        setSeasonName(d.season?.name ?? null);
      })
      .finally(() => setLoading(false));
  }, [gameId, period]);

  return (
    <div className={`space-y-6 ${compact ? "" : "max-w-2xl mx-auto"}`}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h1 className={cn("text-2xl font-display font-bold", isNativeApp && "sr-only")}>미니게임 랭킹</h1>
          <Link href="/games" className="text-xs text-muted-foreground hover:underline">
            ← 허브
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select className="border rounded-lg px-3 py-2 text-sm" value={gameId} onChange={(e) => setGameId(e.target.value)}>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <Button variant={period === "all" ? "default" : "outline"} size="sm" className="rounded-lg" onClick={() => setPeriod("all")}>
          전체
        </Button>
        <Button variant={period === "season" ? "default" : "outline"} size="sm" className="rounded-lg" onClick={() => setPeriod("season")}>
          시즌{seasonName ? ` · ${seasonName}` : ""}
        </Button>
      </div>

      <Card className="border-2 border-folk-cobalt/20">
        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-muted" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">랭킹 데이터 없음 (Z4 SQL + 대국 필요)</p>
          ) : (
            entries.map((e) => (
            <div key={e.userId} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-8 font-bold text-folk-terracotta">#{e.rank}</span>
              <span className="flex-1 font-medium">{e.username}</span>
              <span className="text-xs text-muted-foreground">{TIER_LABELS[e.tier as MinigameTier] ?? e.tier}</span>
              <span className="font-mono text-xs">{e.mmr} MMR</span>
              <span className="text-xs text-muted-foreground">{e.wins}W {e.losses}L</span>
            </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
