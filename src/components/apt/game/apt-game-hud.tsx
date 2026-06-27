"use client";

import { memo } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameHudInner() {
  const { game, userLevel, userAvatarUrl, userName, setShopOpen } = useAptGameRequired();

  return (
    <div className="apt-game-hud pointer-events-auto absolute inset-x-0 top-0 z-[90] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="apt-game-hud-bar flex items-center gap-2 rounded-[1.25rem] px-2 py-1.5">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <div className="apt-game-avatar-ring relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
            {userAvatarUrl ? (
              <Image src={userAvatarUrl} alt="" fill className="object-cover" sizes="44px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200 text-lg">
                🏠
              </span>
            )}
          </div>
          <div className="apt-game-level-badge flex h-10 min-w-[2.75rem] flex-col items-center justify-center rounded-xl px-1">
            <span className="text-[7px] font-bold uppercase tracking-wide text-[#8b6914]">Lv</span>
            <span className="text-sm font-black leading-none text-[#5c4033]">{userLevel}</span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 flex-col gap-1">
          <div className="apt-game-currency apt-game-currency-gold flex items-center gap-1 rounded-xl py-0.5 pl-2 pr-0.5">
            <span className="text-sm leading-none">🪙</span>
            <span className="min-w-[3.5rem] text-[11px] font-black tabular-nums">
              {game.gold.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setShopOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/30 text-amber-900 active:scale-95"
              aria-label="골드 상점"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
          <div className="apt-game-currency apt-game-currency-gem flex items-center gap-1 rounded-xl py-0.5 pl-2 pr-0.5">
            <span className="text-xs leading-none">💎</span>
            <span className="min-w-[2rem] text-[11px] font-black tabular-nums">{game.gems}</span>
            <button
              type="button"
              onClick={() => setShopOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-400/25 text-violet-900 active:scale-95"
              aria-label="젬 상점"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
      {userName && (
        <p className="sr-only">{userName}의 집</p>
      )}
    </div>
  );
}

export const AptGameHud = memo(AptGameHudInner);
