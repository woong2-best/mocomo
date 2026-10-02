"use client";

import { ArrowRight, Home, MapPin } from "lucide-react";
import type { VisitFunnelState } from "@/lib/apt/world/visit-funnel-types";
import { cn } from "@/lib/utils";

const STEPS = ["층 이동", "복도", "입장"] as const;

export function AptVisitFunnelPanel({
  funnel,
  onEnter,
  onCancel,
  className,
}: {
  funnel: VisitFunnelState;
  onEnter: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto rounded-2xl border border-pink-400/35 bg-black/75 p-3 shadow-xl backdrop-blur-md space-y-2.5",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pink-500/25 text-pink-200">
          <Home className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-pink-200/90">집 구경 중</p>
          <p className="text-sm font-bold text-white truncate">
            {funnel.targetName}
            <span className="ml-1 text-[10px] font-normal text-white/55">{funnel.targetFloor}층</span>
          </p>
          <p className="text-[10px] text-white/50 mt-0.5">{funnel.hint}</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 text-[10px] text-white/45 hover:text-white/70"
          >
            취소
          </button>
        )}
      </div>

      <div className="flex gap-1">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = funnel.step > n;
          const current = funnel.step === n;
          return (
            <div key={label} className="flex-1 text-center">
              <div
                className={cn(
                  "mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border",
                  done && "border-emerald-400/50 bg-emerald-500/25 text-emerald-100",
                  current && "border-pink-400/60 bg-pink-500/30 text-pink-100 animate-pulse",
                  !done && !current && "border-white/15 text-white/35"
                )}
              >
                {done ? "✓" : n}
              </div>
              <p className={cn("text-[9px] font-semibold", current ? "text-pink-200" : "text-white/40")}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1 text-[11px] font-semibold text-white/85">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-pink-300" />
        {funnel.phaseLabel}
      </p>

      {funnel.step === 3 && funnel.canEnter && (
        <button
          type="button"
          onClick={onEnter}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 py-2.5 text-xs font-bold text-white shadow-lg animate-pulse hover:bg-pink-400"
        >
          입장하기
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {funnel.step === 3 && !funnel.canEnter && funnel.atDoor && (
        <p className="text-center text-[10px] text-amber-200/90">현관문 앞 — 아래 상호작용 버튼을 누르세요</p>
      )}
    </div>
  );
}
