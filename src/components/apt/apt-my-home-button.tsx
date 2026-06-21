"use client";

import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function AptMyHomeButton({
  onClick,
  compact,
  className,
}: {
  onClick: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border border-pink-400/40 bg-pink-500/20 font-bold text-pink-100 shadow-md transition hover:bg-pink-500/30",
        compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs",
        className
      )}
    >
      <Home className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span>내 집 가기</span>
    </button>
  );
}
