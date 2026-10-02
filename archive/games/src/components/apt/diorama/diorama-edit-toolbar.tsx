"use client";

import { Copy, RotateCw, Trash2 } from "lucide-react";
import { memo } from "react";
import { getStickerAsset } from "@/lib/diorama/sticker-catalog";
import { cn } from "@/lib/utils";

function DioramaEditToolbarInner({
  selectedTypeId,
  canDelete,
  paletteOpen,
  onRotate,
  onDuplicate,
  onDelete,
}: {
  selectedTypeId: string;
  canDelete: boolean;
  paletteOpen: boolean;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const asset = getStickerAsset(selectedTypeId);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-[#5c4033]/15 bg-white/92 px-3 py-2 shadow-lg backdrop-blur-md",
        paletteOpen
          ? "bottom-[max(11.5rem,calc(4.5rem+env(safe-area-inset-bottom)))]"
          : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
      )}
    >
      <span className="max-w-[5rem] truncate text-[10px] font-bold text-[#5c4033]">
        {asset?.label ?? "선택됨"}
      </span>
      <button
        type="button"
        data-testid="edit-rotate"
        onClick={onRotate}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border border-[#5c4033]/12 bg-[#faf3ea] text-[#5c4033] active:scale-95"
        )}
        aria-label="회전"
      >
        <RotateCw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#5c4033]/12 bg-[#faf3ea] text-[#5c4033] active:scale-95"
        aria-label="복제"
      >
        <Copy className="h-4 w-4" />
      </button>
      {canDelete && (
        <button
          type="button"
          data-testid="edit-delete"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-9 touch-manipulation items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-[10px] font-bold text-red-600 active:scale-95"
          aria-label="삭제"
        >
          <Trash2 className="h-4 w-4" />
          삭제
        </button>
      )}
    </div>
  );
}

export const DioramaEditToolbar = memo(DioramaEditToolbarInner);
