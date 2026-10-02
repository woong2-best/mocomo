"use client";

import { Moon, Sun } from "lucide-react";
import { formatWorldClock } from "@/lib/apt/day-night";
import { cn } from "@/lib/utils";

export function AptTimeHud({
  hour,
  phaseLabel,
  className,
}: {
  hour: number | null;
  phaseLabel: string | null;
  className?: string;
}) {
  if (hour == null || !phaseLabel) return null;
  const isNight = phaseLabel === "밤" || phaseLabel === "새벽" || phaseLabel === "저녁";

  return (
    <div
      className={cn(
        "pointer-events-none rounded-xl border bg-white/92 px-3 py-2 shadow-sm backdrop-blur-md",
        isNight ? "border-indigo-200/80" : "border-amber-100/80",
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {isNight ? <Moon className="h-3 w-3 text-indigo-400" /> : <Sun className="h-3 w-3 text-amber-500" />}
        실시간 낮·밤
      </p>
      <p className="text-xs font-bold text-folk-cobalt tabular-nums">
        {phaseLabel} · {formatWorldClock(hour)}
      </p>
    </div>
  );
}
