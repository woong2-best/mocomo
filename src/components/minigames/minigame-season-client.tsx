"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MinigameRankingClient } from "@/components/minigames/minigame-ranking-client";
import { Card, CardContent } from "@/components/ui/card";

type Season = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export function MinigameSeasonClient() {
  const [season, setSeason] = useState<Season | null>(null);

  useEffect(() => {
    void fetch("/api/minigames/season")
      .then((r) => r.json())
      .then((d) => setSeason(d.season));
  }, []);

  const daysLeft = season
    ? Math.max(0, Math.ceil((new Date(season.endsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">시즌</h1>
        <Link href="/games" className="text-xs text-muted-foreground hover:underline">
          ← 허브
        </Link>
      </div>

      {season ? (
        <Card className="border-2 border-folk-gold/30 bg-folk-gold/5">
          <CardContent className="p-4 space-y-1">
            <p className="font-bold text-lg">{season.name}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(season.startsAt).toLocaleDateString("ko")} ~{" "}
              {new Date(season.endsAt).toLocaleDateString("ko")}
            </p>
            {daysLeft != null && (
              <p className="text-xs text-folk-terracotta font-semibold">종료까지 {daysLeft}일</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground text-center">활성 시즌 없음 (Z4 SQL + 소켓 서버 기동)</p>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">시즌 랭킹</h2>
        <MinigameRankingClient defaultPeriod="season" />
      </div>
    </div>
  );
}
