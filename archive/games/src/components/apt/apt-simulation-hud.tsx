"use client";

import type { SimulationSnapshot } from "@/lib/apt/simulation/types";
import { cn } from "@/lib/utils";

const PHASE_LABEL = {
  morning: "아침",
  afternoon: "오후",
  evening: "저녁",
  night: "밤",
};

export function AptSimulationHud({ snapshot }: { snapshot: SimulationSnapshot | null }) {
  if (!snapshot) return null;

  return (
    <div className="pointer-events-none absolute top-3 right-3 z-10 flex max-w-[min(100%,18rem)] flex-col gap-2">
      <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.2)] bg-background/92 px-3 py-2 shadow-folk-sm backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">생활 시뮬레이션</p>
        <p className="text-xs font-bold text-folk-cobalt">{PHASE_LABEL[snapshot.dayPhase]} · 실시간</p>
      </div>
      {snapshot.residents.map((r) => (
        <div
          key={r.id}
          className={cn(
            "rounded-xl border px-3 py-2 shadow-sm backdrop-blur-md",
            r.isOwner
              ? "border-folk-terracotta/40 bg-folk-terracotta/10"
              : "border-[hsl(var(--folk-cobalt)/0.15)] bg-background/90"
          )}
        >
          <p className="text-xs font-bold text-foreground truncate">{r.displayName}</p>
          <p className="text-[11px] text-folk-terracotta font-semibold">{r.activityLabel}</p>
          <div className="mt-1.5 flex gap-2 text-[9px] text-muted-foreground tabular-nums">
            <span>⚡ {Math.round(r.energy)}</span>
            <span>♥ {Math.round(r.mood)}</span>
          </div>
        </div>
      ))}
      {snapshot.furniture.some((f) => f.type === "tv" && f.active) && (
        <div className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-sky-700">
          📺 TV 시청 중
        </div>
      )}
    </div>
  );
}
