"use client";

import { ChevronDown, MoreHorizontal, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onMinimize?: () => void;
  onInvite?: () => void;
  onSettings?: () => void;
  className?: string;
};

export function CallTopBar({ onMinimize, onInvite, onSettings, className }: Props) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-safe pb-2",
        className
      )}
    >
      <button
        type="button"
        onClick={onMinimize}
        className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
        aria-label="통화 최소화"
      >
        <ChevronDown className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onInvite}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
          aria-label="초대하기"
        >
          <UserPlus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onSettings}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
          aria-label="설정"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
