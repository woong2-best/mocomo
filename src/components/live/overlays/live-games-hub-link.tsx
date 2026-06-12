"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { getSortedGames } from "@/lib/games-catalog";
import { cn } from "@/lib/utils";

/** 라이브 스튜디오 — GAME 허브 + 작은 타일 목록 */
export function LiveGamesHubLink({ compact = false }: { compact?: boolean }) {
  const games = getSortedGames();

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-white/20 bg-black/50 p-2 space-y-2"
          : "rounded-xl border border-border bg-muted/30 p-3 space-y-2"
      }
    >
      <Link
        href="/games"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 text-xs font-bold",
          compact ? "text-white/90 hover:text-white" : "text-foreground hover:text-primary"
        )}
      >
        <Gamepad2 className="h-4 w-4 shrink-0" />
        GAME
      </Link>

      <div className="grid grid-cols-3 gap-1.5">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <Link
              key={game.id}
              href={game.href}
              target="_blank"
              rel="noopener noreferrer"
              title={game.name}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg border p-1.5 min-h-[3.5rem] text-center transition-colors",
                compact
                  ? "border-white/15 bg-white/5 hover:bg-white/10 text-white/90"
                  : "border-border bg-background hover:bg-muted text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[9px] font-medium leading-tight line-clamp-2">{game.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
