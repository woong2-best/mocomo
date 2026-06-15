"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Trophy } from "lucide-react";
import {
  RANK_TIER_LABELS,
  VEHICLE_SPECS,
  type RankTier,
  type VehicleTypeId,
} from "@/lib/minigames/parking-rush-logic";

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

type ParkingShowcase = {
  vehicleId: string;
  carColor?: string;
  tier: RankTier;
  score: number;
  levelName: string;
  parked: boolean;
};

export function ProfileMinigamePanel({ username }: { username: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [showcase, setShowcase] = useState<ParkingShowcase | null>(null);

  useEffect(() => {
    void fetch(`/api/minigames/stats?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ratings) setStats(d);
      });
  }, [username]);

  useEffect(() => {
    void fetch(`/api/minigames/parking-rush/showcase?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => setShowcase(d.showcase ?? null));
  }, [username]);

  if (!stats || stats.ratings.length === 0) return null;

  const vehicleLabel =
    showcase && showcase.vehicleId in VEHICLE_SPECS
      ? VEHICLE_SPECS[showcase.vehicleId as VehicleTypeId].label
      : showcase?.vehicleId;

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

        {showcase && (
          <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 to-black/20 p-3 space-y-1">
            <p className="text-[10px] font-semibold text-cyan-300/80 flex items-center gap-1">
              <Car className="h-3 w-3" /> 주차 러쉬 전시 차량
            </p>
            <p className="text-sm font-bold text-cyan-50">{vehicleLabel}</p>
            <p className="text-xs text-muted-foreground truncate">{showcase.levelName}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-yellow-200">{showcase.score.toLocaleString()}점</span>
              <span className="text-violet-300">{RANK_TIER_LABELS[showcase.tier]}</span>
            </div>
            {showcase.carColor && (
              <span
                className="inline-block h-3 w-3 rounded-full border border-white/30"
                style={{ backgroundColor: showcase.carColor }}
                title="차량 색"
              />
            )}
          </div>
        )}

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
