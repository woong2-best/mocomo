"use client";

import { listChartsForPicker } from "@/lib/minigames/piano-rush-charts";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (chartId: string) => void;
  className?: string;
};

const CHARTS = listChartsForPicker();

export function PianoSongPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">곡 선택</label>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          저작권 만료 · PD 클래식
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-violet-500/20 divide-y divide-white/5">
        {CHARTS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-violet-500/10",
              value === c.id && "bg-violet-500/20 ring-1 ring-inset ring-violet-500/40"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{c.title}</span>
              <span className="shrink-0 text-[10px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                {c.difficulty}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {c.artist} · 약 {c.durationSec}초
            </p>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Beethoven, Bach, Mozart, Pachelbel, Grieg 등 공域곡 멜로디 · Web Audio 합성 (녹음음원 없음)
      </p>
    </div>
  );
}
