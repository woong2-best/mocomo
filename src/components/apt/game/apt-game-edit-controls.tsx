"use client";

import { memo } from "react";
import { Check, RotateCw, X } from "lucide-react";

/** 선택된 가구 아래 배치 그리드 */
function PlacementItemGridInner({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-[5]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: "22%",
        height: "16%",
        transform: "translate(-50%, -45%)",
      }}
    >
      <div
        className="h-full w-full rounded-md border border-emerald-400/50 bg-emerald-400/10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(52,211,153,0.22) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(52,211,153,0.22) 1px, transparent 1px)
          `,
          backgroundSize: "25% 33%",
        }}
      />
    </div>
  );
}

export const PlacementItemGrid = memo(PlacementItemGridInner);

function AptGameEditControlsInner({
  x,
  y,
  onRotate,
  onDelete,
  onConfirm,
}: {
  x: number;
  y: number;
  onRotate: () => void;
  onDelete: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[82]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, 12%)",
      }}
    >
      <div className="pointer-events-auto flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onDelete}
          className="apt-game-edit-btn apt-game-edit-btn-cancel flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
          aria-label="삭제"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onRotate}
          className="apt-game-edit-btn apt-game-edit-btn-rotate flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
          aria-label="회전"
        >
          <RotateCw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="apt-game-edit-btn apt-game-edit-btn-confirm flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
          aria-label="확정"
        >
          <Check className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export const AptGameEditControls = memo(AptGameEditControlsInner);

/** @deprecated full-room grid — game mode uses PlacementItemGrid */
export function AptGameGridOverlay() {
  return null;
}
