"use client";

import { memo } from "react";
import { ChevronRight } from "lucide-react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameMissionBannerInner() {
  const { primaryMission, setMissionOpen } = useAptGameRequired();
  if (!primaryMission) return null;

  return (
    <button
      type="button"
      onClick={() => setMissionOpen(true)}
      className="apt-game-mission-banner pointer-events-auto absolute inset-x-3 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.25rem)] z-[88] flex items-center gap-2 rounded-2xl border border-[#e8dcc8] bg-[#fffaf3]/95 px-3 py-2.5 text-left shadow-md backdrop-blur-sm active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
        📋
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-black text-[#5c4033]">{primaryMission.title}</p>
        <p className="truncate text-[9px] text-[#8b7355]">
          {primaryMission.progress}/{primaryMission.target} · +{primaryMission.goldReward}G
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#8b7355]" />
    </button>
  );
}

export const AptGameMissionBanner = memo(AptGameMissionBannerInner);
