"use client";

import { memo, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  filterAssetsForGameTab,
  GAME_FURNITURE_TABS,
  type GameFurnitureTabId,
} from "@/lib/diorama/game-furniture-tabs";
import {
  getCatalogByCategory,
  PALETTE_CATEGORIES,
} from "@/lib/diorama/sticker-edit-utils";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";
import {
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
  gameMode,
}: {
  typeId: string;
  label: string;
  src: string;
  isPlacing: boolean;
  onTapPlace: (typeId: string) => void;
  owned: boolean;
  price: number;
  gameMode: boolean;
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
        "flex shrink-0 touch-none flex-col items-center gap-1 active:scale-95",
        gameMode ? "apt-game-palette-card w-[5.25rem] rounded-2xl p-2" : "rounded-xl border p-2",
        !gameMode &&
          (isPlacing
            ? "border-pink-400 bg-pink-50 ring-2 ring-pink-300"
            : owned
              ? "border-[#5c4033]/12 bg-white"
              : "border-amber-300/50 bg-amber-50/80"),
        gameMode && isPlacing && "apt-game-palette-card-active ring-2 ring-amber-400",
        isDragging && "invisible opacity-0"
      )}
      style={{ touchAction: "none" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        className={cn("w-full object-contain", gameMode ? "h-14" : "h-12")}
        draggable={false}
      />
      <span className="w-full truncate text-center text-[8px] font-bold text-[#5c4033]">{label}</span>
      <span
        className={cn(
          "mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-black",
          owned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
        )}
      >
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
  const [gameTab, setGameTab] = useState<GameFurnitureTabId>("sofa");
  const [category, setCategory] = useState<(typeof PALETTE_CATEGORIES)[number]["id"]>("furniture");
  const game = useAptGame();
  const canPlace = game?.canPlaceItem ?? (() => true);

  if (!open) return null;

  const allAssets = Object.values(STICKER_CATALOG);
  const items = gameMode
    ? filterAssetsForGameTab(allAssets, gameTab)
    : getCatalogByCategory(category);

  if (gameMode) {
    return (
      <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(max(4.75rem,env(safe-area-inset-bottom)))] z-[75]">
        <div className="apt-game-palette-sheet mx-auto max-w-md overflow-hidden rounded-t-[1.75rem] shadow-2xl">
          <div className="flex gap-1 overflow-x-auto border-b border-[#e8dcc8]/60 px-3 py-2.5">
            {GAME_FURNITURE_TABS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setGameTab(c.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black transition",
                  gameTab === c.id
                    ? "bg-[#5c4033] text-white"
                    : "bg-transparent text-[#8b7355]"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain px-3 py-3 pb-4 [-webkit-overflow-scrolling:touch]">
            {items.map((a) => (
              <PaletteItem
                key={a.id}
                typeId={a.id}
                label={a.label}
                src={a.src}
                isPlacing={selectedTypeId === a.id}
                onTapPlace={onTapPlace}
                owned={canPlace(a.id)}
                price={getStickerGoldPrice(a.id)}
                gameMode
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute inset-x-2 z-[75] rounded-2xl border border-[#5c4033]/15 bg-[#faf3ea]/96 shadow-xl backdrop-blur-md bottom-[max(4.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between border-b border-[#5c4033]/10 px-3 py-2">
        <p className="text-[11px] font-bold text-[#5c4033]">가구 추가</p>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-[10px] font-bold text-[#8b7355]">
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
              category === c.id ? "bg-[#5c4033] text-white" : "bg-white/80 text-[#6b5744] border border-[#5c4033]/10"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-3 pb-3 pt-1">
        {items.map((a) => (
          <PaletteItem
            key={a.id}
            typeId={a.id}
            label={a.label}
            src={a.src}
            isPlacing={selectedTypeId === a.id}
            onTapPlace={onTapPlace}
            owned={canPlace(a.id)}
            price={getStickerGoldPrice(a.id)}
            gameMode={false}
          />
        ))}
      </div>
    </div>
  );
}

export const DioramaFurniturePalette = memo(DioramaFurniturePaletteInner);
