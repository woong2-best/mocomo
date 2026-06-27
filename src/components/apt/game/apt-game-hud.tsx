"use client";

import { memo } from "react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameHudInner() {
  const { game, userLevel, setMissionOpen, dailyDone, dailyTotal } = useAptGameRequired();

  return (
    <div className="apt-game-hud pointer-events-auto absolute inset-x-0 top-0 z-[90] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="apt-game-pill apt-game-level flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[11px] font-black">
            Lv.{userLevel}
          </div>
          <button
            type="button"
            onClick={() => setMissionOpen(true)}
            className="apt-game-pill flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold"
          >
            <span className="text-amber-600">★</span>
            <span>
              미션 {dailyDone}/{dailyTotal}
            </span>
          </button>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="apt-game-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black">
            <span className="text-amber-500">🪙</span>
            {game.gold.toLocaleString()}
          </div>
          <div className="apt-game-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black">
            <span className="text-violet-500">💎</span>
            {game.gems.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export const AptGameHud = memo(AptGameHudInner);
