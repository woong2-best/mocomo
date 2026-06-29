"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Gamepad2, Radio, Trophy, Users, X } from "lucide-react";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { cn } from "@/lib/utils";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { APT_GAME_PATH } from "@/lib/site-routes";
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

export function GamesHubClient({
  embedded,
  onClose,
  onGameNavigate,
}: {
  embedded?: boolean;
  onClose?: () => void;
  onGameNavigate?: (href: string) => void;
}) {
  const { isNativeApp } = useClientPlatform();
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
    <div className={cn("space-y-6", embedded ? "px-2 py-4" : cn("max-w-4xl mx-auto px-4 py-8", isNativeApp ? "pb-native-fab" : "pb-16"))}>
      {embedded && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="fixed top-[calc(var(--header-h)+0.75rem)] right-4 z-[210] flex items-center gap-1.5 rounded-xl border-2 border-folk-cobalt/25 bg-white px-3 py-2 text-xs font-bold text-folk-cobalt shadow-folk hover:bg-folk-cream transition-colors"
        >
          <X className="h-4 w-4" />
          게임 닫기
        </button>
      )}
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
          <Link
            href="/games/ranking"
            className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1 hover:bg-folk-gold/30 transition-colors"
          >
            <Trophy className="h-3 w-3" />
            랭킹
          </Link>
          <Link
            href="/games/history"
            className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1 hover:bg-folk-gold/30 transition-colors"
          >
            전적
          </Link>
          <Link
            href="/games/live"
            className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1 hover:bg-folk-gold/30 transition-colors"
          >
            관전
          </Link>
          <Link
            href="/games/season"
            className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1 hover:bg-folk-gold/30 transition-colors"
          >
            시즌
          </Link>
          <Link
            href="/games/achievements"
            className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1 hover:bg-folk-gold/30 transition-colors"
          >
            업적
          </Link>
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
        <Link
          href={APT_GAME_PATH}
          className="group col-span-2 flex flex-row items-center gap-4 rounded-2xl border-2 border-folk-terracotta/35 bg-gradient-to-br from-folk-gold/25 to-folk-cream/80 p-4 hover:border-folk-terracotta/60 transition-colors"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-folk-cobalt/15 bg-white group-hover:border-folk-terracotta/40">
            <Building2 className="h-7 w-7 text-folk-cobalt" />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-black text-folk-cobalt">APT · 내 집</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              다이오라마 꾸미기 · 상점 · 라이브 TV · 이웃 방문
            </p>
          </div>
        </Link>
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
            if (embedded && onGameNavigate) {
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onGameNavigate(game.href!)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-folk-cobalt/20 bg-folk-cream/60 p-4 hover:border-folk-terracotta/50 hover:bg-folk-gold/10 transition-colors text-left w-full"
                >
                  {inner}
                </button>
              );
            }
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
          친구 초대 · 방 코드 · 관전 · 랭킹 지원
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
