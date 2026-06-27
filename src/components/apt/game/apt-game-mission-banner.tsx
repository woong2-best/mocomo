"use client";

import { memo } from "react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameMissionBannerInner() {
  const { primaryMission, editMode, view, setMissionOpen } = useAptGameRequired();
  if (!primaryMission || editMode) return null;

  return (
    <button
      type="button"
      onClick={() => setMissionOpen(true)}
      className="apt-game-mission-banner pointer-events-auto absolute inset-x-4 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.65rem)] z-[88] flex items-center gap-2 rounded-2xl px-3 py-2 text-left active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#4a3428]">
        {primaryMission.description || primaryMission.title}
      </span>
      <span className="apt-game-reward-pill flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black">
        🪙 {primaryMission.goldReward}
      </span>
    </button>
  );
}

export const AptGameMissionBanner = memo(AptGameMissionBannerInner);
