"use client";

import { memo } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function AptGameZoomControlsInner({
  zoom,
  onZoomIn,
  onZoomOut,
  className,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-auto absolute right-3 z-[86] flex flex-col gap-1.5", className)}>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= 1.35}
        className="apt-game-fab flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40"
        aria-label="확대"
      >
        <Plus className="h-4 w-4 text-[#5c4033]" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= 0.85}
        className="apt-game-fab flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40"
        aria-label="축소"
      >
        <Minus className="h-4 w-4 text-[#5c4033]" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export const AptGameZoomControls = memo(AptGameZoomControlsInner);
