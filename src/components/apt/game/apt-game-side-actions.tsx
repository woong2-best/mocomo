"use client";

import { memo } from "react";
import Link from "next/link";
import { ClipboardList, Gift, Mail, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

function AptGameSideActionsInner() {
  const { editMode, view, setMissionOpen, setActiveTab } = useAptGameRequired();
  if (editMode) return null;

  return (
    <>
      <div className="pointer-events-auto absolute left-3 top-[calc(max(0.5rem,env(safe-area-inset-top))+7.25rem)] z-[86] flex flex-col gap-2">
        <Link
          href="/events"
          className="apt-game-fab flex h-12 w-12 items-center justify-center rounded-2xl active:scale-95"
          aria-label="이벤트"
        >
          <Gift className="h-5 w-5 text-[#5c4033]" strokeWidth={2.2} />
        </Link>
        <Link
          href="/messages"
          className="apt-game-fab flex h-12 w-12 items-center justify-center rounded-2xl active:scale-95"
          aria-label="우편함"
        >
          <Mail className="h-5 w-5 text-[#5c4033]" strokeWidth={2.2} />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setMissionOpen(true)}
        className={cn(
          "apt-game-mission-fab pointer-events-auto absolute left-3 z-[86] flex items-center gap-2 rounded-2xl px-3 py-2.5 active:scale-95",
          "bottom-[calc(max(5.25rem,env(safe-area-inset-bottom))+0.5rem)]"
        )}
      >
        <ClipboardList className="h-5 w-5 text-[#5c4033]" strokeWidth={2.2} />
        <span className="text-[11px] font-black text-[#5c4033]">미션</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("furniture")}
        className={cn(
          "apt-game-play-fab pointer-events-auto absolute right-3 z-[86] flex flex-col items-center active:scale-95",
          "bottom-[calc(max(5.25rem,env(safe-area-inset-bottom))+0.25rem)]"
        )}
        aria-label="꾸미기 시작"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg">
          <Play className="ml-0.5 h-7 w-7 fill-white text-white" />
        </span>
        <span className="apt-game-energy-badge -mt-2 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-black">
          ⚡ 45
        </span>
      </button>

      {view === "room" && (
        <span className="pointer-events-none absolute left-1/2 top-[calc(max(0.5rem,env(safe-area-inset-top))+7.5rem)] z-[85] -translate-x-1/2 rounded-full bg-[#5c4033]/85 px-3 py-1 text-[9px] font-bold text-white">
          방 편집 중
        </span>
      )}
    </>
  );
}

export const AptGameSideActions = memo(AptGameSideActionsInner);
