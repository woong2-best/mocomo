"use client";

import { memo } from "react";
import { Sparkles } from "lucide-react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameHudInner() {
  const { game, userLevel, setMissionOpen, dailyDone, dailyTotal } = useAptGameRequired();
  const missionPct = dailyTotal > 0 ? Math.round((dailyDone / dailyTotal) * 100) : 0;

  return (
    <div className="apt-game-hud pointer-events-auto absolute inset-x-0 top-0 z-[90] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="apt-game-hud-bar flex items-center justify-between gap-2 rounded-2xl px-2.5 py-2">
        <div className="flex items-center gap-2">
          <div className="apt-game-level-badge flex h-10 w-10 flex-col items-center justify-center rounded-xl">
            <span className="text-[8px] font-bold text-[#8b6914]">LV</span>
            <span className="text-sm font-black leading-none text-[#5c4033]">{userLevel}</span>
          </div>
          <button
            type="button"
            onClick={() => setMissionOpen(true)}
            className="flex min-w-0 flex-col items-start rounded-xl bg-white/70 px-2.5 py-1.5 text-left active:scale-[0.98]"
          >
            <span className="flex items-center gap-1 text-[9px] font-black text-[#5c4033]">
              <Sparkles className="h-3 w-3 text-amber-500" />
              오늘의 미션
            </span>
            <span className="text-[10px] font-bold text-[#8b7355]">
              {dailyDone}/{dailyTotal} · {missionPct}%
            </span>
            <span className="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-[#e8dcc8]">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
                style={{ width: `${missionPct}%` }}
              />
            </span>
          </button>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <div className="apt-game-currency apt-game-currency-gold flex items-center gap-1.5 rounded-xl px-2.5 py-1">
            <span className="text-base leading-none">🪙</span>
            <span className="text-[11px] font-black tabular-nums">{game.gold.toLocaleString()}</span>
          </div>
          <div className="apt-game-currency apt-game-currency-gem flex items-center gap-1.5 rounded-xl px-2.5 py-1">
            <span className="text-sm leading-none">💎</span>
            <span className="text-[11px] font-black tabular-nums">{game.gems.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const AptGameHud = memo(AptGameHudInner);
