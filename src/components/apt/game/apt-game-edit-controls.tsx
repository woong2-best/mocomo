"use client";

import { memo } from "react";
import { Check, RotateCw, X } from "lucide-react";
import { STICKER_ROOM_BOUNDS } from "@/lib/diorama/sticker-instance-utils";

/** 편집 모드 그리드 */
function AptGameGridOverlayInner() {
  const { xMin, xMax, yMin, yMax } = STICKER_ROOM_BOUNDS;
  const cols = 8;
  const rows = 6;

  return (
    <div
      className="pointer-events-none absolute z-[6] overflow-hidden rounded-lg opacity-90"
      style={{
        left: `${xMin}%`,
        top: `${yMin}%`,
        width: `${xMax - xMin}%`,
        height: `${yMax - yMin}%`,
        backgroundImage: `
          linear-gradient(to right, rgba(52,211,153,0.25) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(52,211,153,0.25) 1px, transparent 1px)
        `,
        backgroundSize: `${100 / cols}% ${100 / rows}%`,
      }}
    />
  );
}

export const AptGameGridOverlay = memo(AptGameGridOverlayInner);

function AptGameEditControlsInner({
  onRotate,
  onDelete,
  onConfirm,
}: {
  onRotate: () => void;
  onDelete: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-[42%] z-[80] flex -translate-x-1/2 gap-3">
      <button
        type="button"
        onClick={onDelete}
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-300 bg-red-50 text-red-600 shadow-lg active:scale-95"
        aria-label="삭제"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onRotate}
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#5c4033]/20 bg-white text-[#5c4033] shadow-lg active:scale-95"
        aria-label="회전"
      >
        <RotateCw className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-50 text-emerald-700 shadow-lg active:scale-95"
        aria-label="확정"
      >
        <Check className="h-5 w-5" />
      </button>
    </div>
  );
}

export const AptGameEditControls = memo(AptGameEditControlsInner);
