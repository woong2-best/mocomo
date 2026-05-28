"use client";

import { Gem } from "lucide-react";

export function LiveDonationBar({
  goalKrw,
  totalKrw,
}: {
  goalKrw: number | null;
  totalKrw: number;
}) {
  if (!goalKrw || goalKrw <= 0) return null;
  const pct = Math.min(100, Math.round((totalKrw / goalKrw) * 100));
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="flex items-center gap-1 text-amber-800 dark:text-amber-200">
          <Gem className="h-3.5 w-3.5" />
          후원 목표
        </span>
        <span className="tabular-nums">
          {totalKrw.toLocaleString()} / {goalKrw.toLocaleString()}원 ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-background/80 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
