"use client";

import { memo } from "react";
import { Check, RotateCw, Trash2 } from "lucide-react";

function IsoEditOverlayInner({
  onRotate,
  onDelete,
  onConfirm,
}: {
  onRotate: () => void;
  onDelete: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(max(5.5rem,env(safe-area-inset-bottom))+11rem)] z-[80] flex justify-center">
      <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/92 px-4 py-2 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={onDelete}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white active:scale-95"
          aria-label="삭제"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onRotate}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white active:scale-95"
          aria-label="회전"
        >
          <RotateCw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5c4033] text-white active:scale-95"
          aria-label="확정"
        >
          <Check className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export const IsoEditOverlay = memo(IsoEditOverlayInner);
