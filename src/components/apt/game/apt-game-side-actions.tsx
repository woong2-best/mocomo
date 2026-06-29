"use client";

import { memo } from "react";
import Link from "next/link";
import { ClipboardList, Gift, Mail, Play, Shield } from "lucide-react";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

function AptGameSideActionsInner() {
  const { editMode, view, game, setMissionOpen, setActiveTab, boostEnergy } = useAptGameRequired();
  if (editMode) return null;

  const onOverview = view === "overview";

  return (
    <>
      {onOverview && (
        <div className="pointer-events-auto absolute left-3 top-[calc(max(0.5rem,env(safe-area-inset-top))+6.75rem)] z-[86] flex flex-col gap-2">
          <Link
            href="/events"
            className="apt-game-fab flex h-11 w-11 items-center justify-center rounded-2xl active:scale-95"
            aria-label="이벤트"
          >
            <Gift className="h-5 w-5 text-[#5c4033]" strokeWidth={2.2} />
          </Link>
          <Link
            href={buildAptMailboxUrl()}
            className="apt-game-fab flex h-11 w-11 items-center justify-center rounded-2xl active:scale-95"
            aria-label="우편함"
          >
            <Mail className="h-5 w-5 text-[#5c4033]" strokeWidth={2.2} />
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMissionOpen(true)}
        className={cn(
          "apt-game-mission-fab pointer-events-auto absolute left-3 z-[86] flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 active:scale-95",
          "bottom-[calc(max(5.5rem,env(safe-area-inset-bottom))+0.25rem)]"
        )}
      >
        <ClipboardList className="h-6 w-6 text-[#5c4033]" strokeWidth={2.2} />
        <span className="text-[9px] font-black text-[#5c4033]">미션</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (game.energy < 3) void boostEnergy();
          else setActiveTab("furniture");
        }}
        className={cn(
          "apt-game-play-fab pointer-events-auto absolute right-3 z-[86] flex flex-col items-center active:scale-95",
          "bottom-[calc(max(5.5rem,env(safe-area-inset-bottom))+0.15rem)]"
        )}
        aria-label="꾸미기"
      >
        <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full">
          <Play className="relative z-10 ml-0.5 h-8 w-8 fill-white text-white drop-shadow" />
        </span>
        <span className="apt-game-energy-badge -mt-3 flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-black">
          <Shield className="h-3 w-3" />
          {game.energy}
        </span>
      </button>
    </>
  );
}

export const AptGameSideActions = memo(AptGameSideActionsInner);
