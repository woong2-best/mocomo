"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { FirstEntryPhase } from "@/hooks/use-apt-first-entry";

function AptFirstEntryLayerInner({
  visible,
  label,
  vignetteOpacity,
  phase,
  onSkip,
}: {
  visible: boolean;
  label: string | null;
  vignetteOpacity: number;
  phase: FirstEntryPhase;
  onSkip: () => void;
}) {
  if (!visible && vignetteOpacity <= 0.01) return null;

  return (
    <button
      type="button"
      aria-label="인트로 건너뛰기"
      onClick={onSkip}
      className={cn(
        "apt-first-entry-layer pointer-events-auto absolute inset-0 z-[200]",
        !visible && "pointer-events-none"
      )}
    >
      {visible && (
        <div className="apt-first-entry-loading absolute inset-0 flex flex-col items-center justify-center bg-[#f5ebe0]">
          <div className="apt-first-entry-pulse mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 shadow-inner" />
          {label && (
            <p className="text-xs font-bold tracking-wide text-[#8b7355]/90">{label}</p>
          )}
          {phase === "reveal" && (
            <p className="mt-6 text-[10px] font-medium text-[#a08968]/70">탭하여 건너뛰기</p>
          )}
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: vignetteOpacity,
          background:
            "radial-gradient(ellipse at 50% 42%, transparent 35%, rgba(42,31,20,0.22) 100%)",
        }}
      />
    </button>
  );
}

export const AptFirstEntryLayer = memo(AptFirstEntryLayerInner);
