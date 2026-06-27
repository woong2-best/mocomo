"use client";

import { memo } from "react";
import Link from "next/link";
import { Calendar, Mail } from "lucide-react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameSideActionsInner() {
  const { editMode, view } = useAptGameRequired();
  if (editMode) return null;

  return (
    <div className="pointer-events-auto absolute left-3 top-[calc(max(0.5rem,env(safe-area-inset-top))+7.5rem)] z-[86] flex flex-col gap-2">
      <Link
        href="/events"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e8dcc8] bg-[#fffaf3]/95 text-[#5c4033] shadow-md active:scale-95"
        aria-label="이벤트"
      >
        <Calendar className="h-5 w-5" />
      </Link>
      <Link
        href="/messages"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e8dcc8] bg-[#fffaf3]/95 text-[#5c4033] shadow-md active:scale-95"
        aria-label="우편함"
      >
        <Mail className="h-5 w-5" />
      </Link>
      {view === "room" && (
        <span className="rounded-full bg-[#5c4033]/90 px-2 py-0.5 text-center text-[8px] font-bold text-white">
          방
        </span>
      )}
    </div>
  );
}

export const AptGameSideActions = memo(AptGameSideActionsInner);
