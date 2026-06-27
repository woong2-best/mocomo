"use client";

import { memo } from "react";
import { Check, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
          linear-gradient(to right, rgba(52,211,153,0.28) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(52,211,153,0.28) 1px, transparent 1px)
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
  paletteOpen,
}: {
  onRotate: () => void;
  onDelete: () => void;
  onConfirm: () => void;
  paletteOpen?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-1/2 z-[82] flex -translate-x-1/2 gap-4",
        paletteOpen ? "top-[38%]" : "top-[44%]"
      )}
    >
      <button
        type="button"
        onClick={onDelete}
        className="apt-game-edit-btn apt-game-edit-btn-cancel flex h-12 w-12 items-center justify-center rounded-full active:scale-95"
        aria-label="삭제"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onRotate}
        className="apt-game-edit-btn apt-game-edit-btn-rotate flex h-12 w-12 items-center justify-center rounded-full active:scale-95"
        aria-label="회전"
      >
        <RotateCw className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="apt-game-edit-btn apt-game-edit-btn-confirm flex h-12 w-12 items-center justify-center rounded-full active:scale-95"
        aria-label="확정"
      >
        <Check className="h-5 w-5" />
      </button>
    </div>
  );
}

export const AptGameEditControls = memo(AptGameEditControlsInner);
