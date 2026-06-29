"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MinigameRankingClient } from "@/components/minigames/minigame-ranking-client";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

type Season = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export function MinigameSeasonClient() {
  const { isNativeApp } = useClientPlatform();
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/minigames/season")
      .then((r) => r.json())
      .then((d) => setSeason(d.season))
      .finally(() => setLoading(false));
  }, []);

  const daysLeft = season
    ? Math.max(0, Math.ceil((new Date(season.endsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-display font-bold", isNativeApp && "sr-only")}>시즌</h1>
        <Link href="/games" className="text-xs text-muted-foreground hover:underline">
          ← 허브
        </Link>
      </div>

      {loading ? (
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      ) : season ? (
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

      <Card className="border-2 border-cyan-500/25 bg-gradient-to-br from-cyan-950/20 to-black/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Car className="h-8 w-8 shrink-0 text-cyan-400" />
            <div className="space-y-1 min-w-0">
              <p className="font-bold flex items-center gap-1.5">
                주차 러쉬 시즌
                <Crown className="h-4 w-4 text-yellow-400" />
              </p>
              <p className="text-xs text-muted-foreground">
                주차·무충돌·역주차·1위 보너스로 시즌 포인트 적립 · 토너먼트는 2배
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary" className="rounded-lg">
              <Link href="/play/parking-rush">플레이 허브</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-lg">
              <Link href="/play/parking-rush">랭킹 · 토너먼트</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-3">시즌 랭킹</h2>
        <MinigameRankingClient defaultPeriod="season" />
      </div>
    </div>
  );
}
