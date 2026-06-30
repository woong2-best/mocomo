"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Gamepad2, X } from "lucide-react";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { PageSection } from "@/components/layout/page-section";
import { GamesHubStats } from "@/components/games/games-hub-stats";
import {
  MotionChip,
  MotionInViewIndexed,
  MotionPress,
} from "@/components/motion/motion-primitives";
import { cn } from "@/lib/utils";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { APT_GAME_PATH } from "@/lib/site-routes";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type MinigameCategory,
} from "@/lib/minigames/types";
import {
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

  const games = useMemo(() => {
    if (category === "all") {
      return [...getAllMinigames()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
    return getMinigamesByCategory(category);
  }, [category]);

  const body = (
    <div className="space-y-6">
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
      {!embedded && (
        <FolkSectionTitle
          icon="sun"
          className={cn(isNativeApp && "sr-only")}
        >
          미니게임
        </FolkSectionTitle>
      )}

      {!embedded && <GamesHubStats />}

      <PageSection title="카테고리">
      <div className="flex flex-wrap gap-1.5">
        <MotionChip
          active={category === "all"}
          onClick={() => setCategory("all")}
          label="전체"
          layoutId="games-hub-chip"
        />
        {CATEGORY_ORDER.map((c) => (
          <MotionChip
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            label={CATEGORY_LABELS[c]}
            layoutId="games-hub-chip"
          />
        ))}
      </div>
      </PageSection>

      <PageSection title="플레이" icon={Gamepad2}>
      <div key={category} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MotionInViewIndexed index={0}>
        <MotionPress>
        <Link
          href={APT_GAME_PATH}
          className="group col-span-2 flex flex-row items-center gap-4 rounded-2xl border-2 border-folk-terracotta/35 bg-gradient-to-br from-folk-gold/25 to-folk-cream/80 p-4 hover:border-folk-terracotta/60 transition-colors folk-card-interactive"
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
        </MotionPress>
        </MotionInViewIndexed>
        {games.map((game, i) => {
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
                <MotionInViewIndexed key={game.id} index={i + 1}>
                <MotionPress>
                <button
                  type="button"
                  onClick={() => onGameNavigate(game.href!)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-folk-cobalt/20 bg-folk-cream/60 p-4 hover:border-folk-terracotta/50 hover:bg-folk-gold/10 transition-colors text-left w-full folk-card-interactive"
                >
                  {inner}
                </button>
                </MotionPress>
                </MotionInViewIndexed>
              );
            }
            return (
              <MotionInViewIndexed key={game.id} index={i + 1}>
              <MotionPress>
              <Link
                href={game.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-folk-cobalt/20 bg-folk-cream/60 p-4 hover:border-folk-terracotta/50 hover:bg-folk-gold/10 transition-colors folk-card-interactive"
              >
                {inner}
              </Link>
              </MotionPress>
              </MotionInViewIndexed>
            );
          }

          return (
            <MotionInViewIndexed key={game.id} index={i + 1}>
            <div
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-4 opacity-80 cursor-not-allowed"
              title="준비 중입니다"
            >
              {inner}
            </div>
            </MotionInViewIndexed>
          );
        })}
      </div>
      </PageSection>

        <p className="text-xs text-center text-muted-foreground pt-2">
          친구 초대 · 방 코드 · 관전 · 랭킹 지원
        </p>
    </div>
  );

  if (embedded) {
    return <div className="space-y-6 px-2 py-4">{body}</div>;
  }

  return (
    <AppPageChrome maxWidth="4xl" spacing="sm" className="py-4">
      {body}
    </AppPageChrome>
  );
}
