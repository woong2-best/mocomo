"use client";

import { memo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";
import type { StickerCategory } from "@/lib/diorama/sticker-types";
import {
  canUseSticker,
  getStickerGoldPrice,
  shopItemsByCategory,
} from "@/lib/apt/game/shop";
import { useAptGameRequired } from "./apt-game-context";

const CATS: { id: StickerCategory; label: string }[] = [
  { id: "furniture", label: "소파·테이블" },
  { id: "decor", label: "데코" },
  { id: "prop", label: "소품" },
  { id: "lighting", label: "조명" },
];

function AptGameShopSheetInner() {
  const { game, shopOpen, setShopOpen, purchaseSticker } = useAptGameRequired();
  const [cat, setCat] = useState<StickerCategory>("furniture");
  const [msg, setMsg] = useState<string | null>(null);

  if (!shopOpen) return null;

  const items = shopItemsByCategory(cat);

  return (
    <div className="pointer-events-auto absolute inset-0 z-[100] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
      <div className="apt-game-sheet max-h-[72dvh] rounded-t-[1.75rem]">
        <div className="flex items-center justify-between border-b border-[#e8dcc8] px-4 py-3">
          <div>
            <h2 className="text-base font-black text-[#5c4033]">가구 상점</h2>
            <p className="text-[10px] text-[#8b7355]">🪙 {game.gold.toLocaleString()} · 💎 {game.gems}</p>
          </div>
          <button type="button" onClick={() => setShopOpen(false)} className="rounded-full p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {msg && (
          <p className="mx-4 mt-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-[10px] font-bold text-amber-900">
            {msg}
          </p>
        )}

        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold",
                cat === c.id ? "bg-[#5c4033] text-white" : "bg-white text-[#8b7355]"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:grid-cols-4">
          {items.map((a) => {
            const owned = canUseSticker(a.id, game.ownedStickers);
            const price = getStickerGoldPrice(a.id);
            return (
              <button
                key={a.id}
                type="button"
                disabled={owned && price > 0}
                onClick={async () => {
                  if (owned) {
                    setMsg("이미 보유 중이에요. 가구 탭에서 배치하세요.");
                    return;
                  }
                  const res = await purchaseSticker(a.id);
                  if (res.error) {
                    setMsg(res.error);
                    return;
                  }
                  setMsg(`${STICKER_CATALOG[a.id]?.label} 구매! 가구 탭에서 배치하세요 ✦`);
                }}
                className={cn(
                  "apt-game-shop-card flex flex-col items-center rounded-2xl p-2.5",
                  owned && "opacity-75"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.src} alt={a.label} className="h-14 w-full object-contain" />
                <span className="mt-1 w-full truncate text-center text-[9px] font-bold text-[#5c4033]">
                  {a.label}
                </span>
                <span className="mt-0.5 text-[9px] font-black text-amber-700">
                  {owned ? "보유" : price === 0 ? "무료" : `${price.toLocaleString()}G`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const AptGameShopSheet = memo(AptGameShopSheetInner);
