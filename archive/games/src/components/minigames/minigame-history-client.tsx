"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllMinigames } from "@/lib/minigames/registry";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

type MatchRow = {
  id: string;
  gameId: string;
  roomId: string;
  winnerId: string | null;
  result: string | null;
  playerNames?: Record<string, string>;
  endedAt: string;
  moveCount: number;
};

export function MinigameHistoryClient() {
  const { isNativeApp } = useClientPlatform();
  const games = getAllMinigames().filter((g) => g.id !== "sketch-quiz");
  const [gameId, setGameId] = useState<string>("");
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    const q = gameId ? `?gameId=${gameId}` : "";
    void fetch(`/api/minigames/matches${q}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => setRows(d.matches ?? []))
      .catch(() => setLoadError("전적을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [gameId]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-display font-bold", isNativeApp && "sr-only")}>내 전적</h1>
        <Link href="/games" className="text-xs text-muted-foreground hover:underline">
          ← 허브
        </Link>
      </div>

      <select
        className="border rounded-lg px-3 py-2 text-sm"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      >
        <option value="">전체 게임</option>
        {games.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <Card className="border-2 border-folk-cobalt/20">
        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-muted" />
              ))}
            </div>
          ) : loadError ? (
            <p className="p-6 text-sm text-destructive text-center">{loadError}</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">전적 없음 (로그인 + Z4 SQL)</p>
          ) : (
            rows.map((m) => {
            const game = games.find((g) => g.id === m.gameId);
            const replay = game?.supportsReplay !== false;
            return (
              <div key={m.id} className="px-4 py-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold w-24">{game?.name ?? m.gameId}</span>
                <span className="flex-1 text-muted-foreground truncate">{m.result ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{m.moveCount}수</span>
                {replay && (
                  <Link href={`/play/${m.gameId}/replay/${m.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg">
                      <RotateCcw className="h-3 w-3" />
                      리플레이
                    </Button>
                  </Link>
                )}
              </div>
            );
          })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
