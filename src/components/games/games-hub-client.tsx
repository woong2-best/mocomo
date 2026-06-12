"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { getSortedGames } from "@/lib/games-catalog";

export function GamesHubClient() {
  const games = getSortedGames();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <FolkSectionTitle icon="sun" className="flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-folk-terracotta" />
          GAME
        </FolkSectionTitle>
        <p className="text-sm text-muted-foreground">
          MoCoMo 미니게임 모음입니다. 친구·팔로워 방 또는 랜덤 매칭으로 플레이할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <Link
              key={game.id}
              href={game.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-folk-cobalt/20 bg-folk-cream/60 p-4 hover:border-folk-terracotta/50 hover:bg-folk-gold/10 transition-colors"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-folk-cobalt/15 bg-white group-hover:border-folk-terracotta/40">
                <Icon className="h-6 w-6 text-folk-cobalt" />
              </span>
              <span className="text-sm font-bold text-folk-cobalt text-center">{game.name}</span>
              {game.description && (
                <span className="text-[11px] text-muted-foreground text-center line-clamp-2">
                  {game.description}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
