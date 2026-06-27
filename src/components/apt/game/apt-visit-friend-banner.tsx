"use client";

import { memo } from "react";
import { Sparkles, X } from "lucide-react";

function AptVisitFriendBannerInner({
  hostName,
  onLeave,
}: {
  hostName: string;
  onLeave: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-3 top-[calc(max(0.5rem,env(safe-area-inset-top))+0.5rem)] z-[95]">
      <div className="apt-game-visit-banner flex items-center gap-2 rounded-2xl px-3 py-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg">🏠</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-black text-[#4a3428]">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            {hostName}의 집
          </p>
          <p className="text-[10px] text-[#8b7355]">구경 중 · 미션 진행!</p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1 rounded-full bg-[#5c4033] px-3 py-1.5 text-[10px] font-black text-white active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
          나가기
        </button>
      </div>
    </div>
  );
}

export const AptVisitFriendBanner = memo(AptVisitFriendBannerInner);
