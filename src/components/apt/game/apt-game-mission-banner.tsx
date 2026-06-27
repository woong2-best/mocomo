"use client";

import { memo } from "react";
import { ChevronRight } from "lucide-react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameMissionBannerInner() {
  const { primaryMission, editMode, setMissionOpen } = useAptGameRequired();
  if (!primaryMission || editMode) return null;

  return (
    <button
      type="button"
      onClick={() => setMissionOpen(true)}
      className="apt-game-mission-banner pointer-events-auto absolute inset-x-4 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.75rem)] z-[88] flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xl shadow-sm">
        📋
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-black leading-snug text-[#4a3428]">
          {primaryMission.title}
        </p>
        <p className="truncate text-[10px] font-medium text-[#8b7355]">
          {primaryMission.description}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="apt-game-reward-pill flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black text-amber-900">
          🪙 {primaryMission.goldReward}
        </span>
        <ChevronRight className="h-4 w-4 text-[#a08968]" />
      </div>
    </button>
  );
}

export const AptGameMissionBanner = memo(AptGameMissionBannerInner);
