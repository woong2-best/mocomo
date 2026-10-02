import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";
import type { StickerCategory } from "@/lib/diorama/sticker-types";
import { canPlaceFromStorageList } from "@/lib/apt/economy/storage-utils";

/** 가구별 골드 가격 (무료 기본 가구 포함) */
const BASE_PRICES: Record<string, number> = {
  "room-shell": 0,
  door: 0,
  window: 0,
  sofa: 1200,
  bed: 1500,
  tv: 800,
  desk: 600,
  chair: 350,
  plant: 200,
  rug: 450,
  frame: 180,
  "frame-small": 120,
  lamp: 280,
  books: 90,
  doll: 150,
  shelf: 520,
  poster: 160,
  "coffee-table": 480,
  cushion: 120,
  mug: 60,
  clock: 220,
  bookshelf: 640,
  mascot: 0,
  "mascot-sit": 0,
  vase: 140,
  slippers: 80,
  remote: 50,
  candle: 70,
  magazine: 40,
  polaroid: 100,
  garland: 320,
  basket: 180,
  gamepad: 110,
  "snack-plate": 95,
  "hanging-plant": 260,
  mailbox: 0,
  telephone: 0,
  computer: 0,
  wardrobe: 700,
  mirror: 380,
};

const FREE_STARTER = new Set([
  "room-shell",
  "door",
  "window",
  "sofa",
  "rug",
  "plant",
  "lamp",
  "mailbox",
  "telephone",
  "computer",
  "mascot-sit",
]);

export function getStickerGoldPrice(typeId: string): number {
  if (typeId in BASE_PRICES) return BASE_PRICES[typeId]!;
  const cat = STICKER_CATALOG[typeId]?.category;
  if (cat === "room" || cat === "character") return 0;
  if (cat === "functional") return 0;
  return 300;
}

export function isStarterOwned(typeId: string): boolean {
  return FREE_STARTER.has(typeId);
}

export function canUseSticker(typeId: string, ownedStickers: string[]): boolean {
  if (isStarterOwned(typeId)) return true;
  return ownedStickers.includes(typeId);
}

/** 창고 기준 배치 가능 여부 */
export function canUseStickerFromStorage(
  typeId: string,
  storage: { itemId: string; quantity: number }[]
): boolean {
  return canPlaceFromStorageList(storage, typeId);
}

export const SHOP_CATEGORY_LABELS: Record<StickerCategory, string> = {
  room: "방",
  furniture: "소파·테이블",
  decor: "데코",
  prop: "소품",
  lighting: "조명",
  functional: "기능",
  character: "캐릭터",
};

export function shopItemsByCategory(category: StickerCategory) {
  return Object.values(STICKER_CATALOG)
    .filter((a) => a.category === category && a.id !== "room-shell")
    .map((a) => ({
      ...a,
      goldPrice: getStickerGoldPrice(a.id),
    }));
}
