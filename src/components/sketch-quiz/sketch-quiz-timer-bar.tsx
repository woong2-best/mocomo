"use client";

import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  timeLeft: number;
  roundSeconds: number;
  round: number;
  maxRounds: number;
  roundMessage?: string | null;
};

export function SketchQuizTimerBar({
  timeLeft,
  roundSeconds,
  round,
  maxRounds,
  roundMessage,
}: Props) {
  const pct = roundSeconds > 0 ? Math.min(100, (timeLeft / roundSeconds) * 100) : 0;
  const urgent = timeLeft <= 10;

  return (
    <div className="rounded-xl border-2 border-folk-cobalt/20 bg-folk-gold/10 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "flex items-center gap-2 font-display font-bold tabular-nums",
            urgent && "text-destructive animate-pulse"
          )}
        >
          <Timer className="h-4 w-4 text-folk-terracotta" />
          <span>{timeLeft}초</span>
          <span className="text-xs font-normal text-muted-foreground">/ {roundSeconds}초</span>
        </div>
        <span className="text-sm text-muted-foreground">
          라운드 {round}/{maxRounds}
        </span>
        {roundMessage && (
          <span className="text-sm text-folk-cobalt ml-auto font-medium">{roundMessage}</span>
        )}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            urgent ? "bg-destructive" : "bg-folk-terracotta"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
