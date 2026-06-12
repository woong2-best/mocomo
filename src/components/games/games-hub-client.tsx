"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gamepad2, Radio, Trophy, Users } from "lucide-react";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type MinigameCategory,
} from "@/lib/minigames/types";
import {
  countByStatus,
  getAllMinigames,
  getMinigamesByCategory,
} from "@/lib/minigames/registry";

export function GamesHubClient() {
  const [category, setCategory] = useState<MinigameCategory | "all">("all");
  const liveCount = countByStatus("live") + countByStatus("beta");
  const soonCount = countByStatus("coming_soon");

  const games = useMemo(() => {
    if (category === "all") {
      return [...getAllMinigames()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
    return getMinigamesByCategory(category);
  }, [category]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-3">
        <FolkSectionTitle icon="sun" className="flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-folk-terracotta" />
          미니게임
        </FolkSectionTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          앱 안에서 다른 유저와 실시간으로 플레이합니다. 랜덤 매칭 · 친구 초대 · 방 코드 ·
          관전 · 랭킹 · 리플레이를 게임별로 순차 지원합니다.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 px-2.5 py-1 font-medium">
            <Radio className="h-3 w-3" />
            플레이 가능 {liveCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            준비 중 {soonCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1">
            <Users className="h-3 w-3" />
            2~5명 매칭 · 친구 방
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1">
            <Trophy className="h-3 w-3" />
            MMR · 티어 (예정)
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label="전체" />
        {CATEGORY_ORDER.map((c) => (
          <CategoryChip
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            label={CATEGORY_LABELS[c]}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {games.map((game) => {
          const Icon = game.icon;
          const playable = game.status === "live" || game.status === "beta";
          const inner = (
            <>
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl border-2 bg-white relative",
                  playable
                    ? "border-folk-cobalt/15 group-hover:border-folk-terracotta/40"
                    : "border-border/40 opacity-60"
                )}
              >
                <Icon className="h-6 w-6 text-folk-cobalt" />
                {game.status === "live" && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
                {game.status === "coming_soon" && (
                  <span className="absolute -top-1.5 -right-1 text-[8px] bg-muted text-muted-foreground px-1 rounded">
                    준비
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-folk-cobalt text-center">{game.name}</span>
              <span className="text-[10px] text-muted-foreground text-center line-clamp-2">
                {game.description}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {game.minPlayers === game.maxPlayers
                  ? `${game.minPlayers}인`
                  : `${game.minPlayers}~${game.maxPlayers}인`}
              </span>
            </>
          );

          if (playable && game.href) {
            return (
              <Link
                key={game.id}
                href={game.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-folk-cobalt/20 bg-folk-cream/60 p-4 hover:border-folk-terracotta/50 hover:bg-folk-gold/10 transition-colors"
              >
                {inner}
              </Link>
            );
          }

          return (
            <div
              key={game.id}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-4 opacity-80 cursor-not-allowed"
              title="준비 중입니다"
            >
              {inner}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        오목 · 체스 · 장기 · 끝말잇기 등은 공통 매칭·관전·리플레이 엔진 위에 순차 출시됩니다.
      </p>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-folk-terracotta text-white"
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
