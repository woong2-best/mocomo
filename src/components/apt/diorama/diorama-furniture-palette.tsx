"use client";

import { memo, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { StickerCategory } from "@/lib/diorama/sticker-types";
import {
  getCatalogByCategory,
  PALETTE_CATEGORIES,
} from "@/lib/diorama/sticker-edit-utils";
import {
  canUseSticker,
  getStickerGoldPrice,
} from "@/lib/apt/game/shop";
import { useAptGame } from "@/components/apt/game/apt-game-context";
import { cn } from "@/lib/utils";

function PaletteItem({
  typeId,
  label,
  src,
  isPlacing,
  onTapPlace,
  owned,
  price,
}: {
  typeId: string;
  label: string;
  src: string;
  isPlacing: boolean;
  onTapPlace: (typeId: string) => void;
  owned: boolean;
  price: number;
}) {
  const pointerStart = useRef({ x: 0, y: 0 });
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog:${typeId}`,
    data: { type: "catalog", typeId },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`catalog-${typeId}`}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;
        if (dx * dx + dy * dy > 64) return;
        onTapPlace(typeId);
      }}
      {...listeners}
      {...attributes}
      className={cn(
        "flex shrink-0 touch-none flex-col items-center gap-1 rounded-xl border p-2 active:scale-95",
        isPlacing
          ? "border-pink-400 bg-pink-50 ring-2 ring-pink-300"
          : owned
            ? "border-[#5c4033]/12 bg-white"
            : "border-amber-300/50 bg-amber-50/80",
        isDragging && "invisible opacity-0"
      )}
      style={{ width: 72, touchAction: "none" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="h-12 w-full object-contain" draggable={false} />
      <span className="w-full truncate text-center text-[8px] font-bold text-[#5c4033]">{label}</span>
      <span className={cn("text-[8px] font-black", owned ? "text-emerald-600" : "text-amber-700")}>
        {owned ? (price === 0 ? "무료" : "보유") : `${price.toLocaleString()}G`}
      </span>
    </div>
  );
}

function DioramaFurniturePaletteInner({
  open,
  selectedTypeId,
  onClose,
  onTapPlace,
  gameMode = false,
}: {
  open: boolean;
  selectedTypeId: string | null;
  onClose: () => void;
  onTapPlace: (typeId: string) => void;
  gameMode?: boolean;
}) {
  const [category, setCategory] = useState<StickerCategory>("furniture");
  const game = useAptGame();
  const ownedStickers = game?.game.ownedStickers ?? [];

  if (!open) return null;

  const items = getCatalogByCategory(category);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-2 z-[75] rounded-2xl border border-[#5c4033]/15 bg-[#faf3ea]/96 shadow-xl backdrop-blur-md",
        gameMode
          ? "bottom-[calc(max(4.75rem,env(safe-area-inset-bottom))+0.5rem)]"
          : "bottom-[max(4.5rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div className="flex items-center justify-between border-b border-[#5c4033]/10 px-3 py-2">
        <p className="text-[11px] font-bold text-[#5c4033]">가구 추가 · 탭하면 바로 배치 · 길게 눌러 드래그</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-[10px] font-bold text-[#8b7355]"
        >
          닫기
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto px-2 py-2">
        {PALETTE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[9px] font-bold",
              category === c.id
                ? "bg-[#5c4033] text-white"
                : "bg-white/80 text-[#6b5744] border border-[#5c4033]/10"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-3 pb-3 pt-1 [-webkit-overflow-scrolling:touch]">
        {items.map((a) => (
          <PaletteItem
            key={a.id}
            typeId={a.id}
            label={a.label}
            src={a.src}
            isPlacing={selectedTypeId === a.id}
            onTapPlace={onTapPlace}
            owned={canUseSticker(a.id, ownedStickers)}
            price={getStickerGoldPrice(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

export const DioramaFurniturePalette = memo(DioramaFurniturePaletteInner);
