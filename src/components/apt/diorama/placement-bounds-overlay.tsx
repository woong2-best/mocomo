"use client";

import { memo } from "react";
import { STICKER_ROOM_BOUNDS } from "@/lib/diorama/sticker-instance-utils";

/** 배치 가능 영역 시각화 */
function PlacementBoundsOverlayInner() {
  const { xMin, xMax, yMin, yMax } = STICKER_ROOM_BOUNDS;
  return (
    <div
      className="pointer-events-none absolute z-[5] rounded-lg border-2 border-dashed border-emerald-400/70 bg-emerald-200/15 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.2)]"
      style={{
        left: `${xMin}%`,
        top: `${yMin}%`,
        width: `${xMax - xMin}%`,
        height: `${yMax - yMin}%`,
      }}
    >
      <span className="absolute -top-4 left-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[7px] font-bold text-white">
        배치 가능
      </span>
    </div>
  );
}

export const PlacementBoundsOverlay = memo(PlacementBoundsOverlayInner);
