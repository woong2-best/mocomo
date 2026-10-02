"use client";

import { memo } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useAptGameRequired } from "./apt-game-context";
import { cn } from "@/lib/utils";

function AptGameHudInner() {
  const { game, userAvatarUrl, userName, setShopOpen, setGemShopOpen, editMode, firstEntry } =
    useAptGameRequired();

  return (
    <div
      className={cn(
        "apt-game-hud pointer-events-auto absolute inset-x-0 top-0 z-[90] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]",
        editMode && "opacity-90",
        firstEntry.phase === "ui-fade" && "apt-first-entry-ui-in"
      )}
    >
      <div className="apt-game-hud-bar flex items-center gap-2 rounded-[1.35rem] px-2.5 py-2">
        <div className="apt-game-avatar-ring relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
          {userAvatarUrl ? (
            <Image src={userAvatarUrl} alt="" fill className="object-cover" sizes="44px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200 text-lg">
              🙂
            </span>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="apt-game-currency apt-game-currency-gold flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1">
            <span className="text-sm">🪙</span>
            <span className="min-w-[2.75rem] text-[11px] font-black tabular-nums">
              {game.gold.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setShopOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/25 text-amber-900 active:scale-95"
              aria-label="골드 상점"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
          <div className="apt-game-currency apt-game-currency-gem flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1">
            <span className="text-xs">💎</span>
            <span className="min-w-[1.25rem] text-[11px] font-black tabular-nums">{game.gems}</span>
            <button
              type="button"
              onClick={() => setGemShopOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-900 active:scale-95"
              aria-label="젬 상점"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
      {userName && <p className="sr-only">{userName}의 집</p>}
    </div>
  );
}

export const AptGameHud = memo(AptGameHudInner);
