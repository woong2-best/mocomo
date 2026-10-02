import type { BondeeFurnitureKind } from "@/lib/apt/bondee/types";

/** Game shop sticker id → Bondee 3D furniture kind */
const STICKER_TO_BONDEE: Record<string, BondeeFurnitureKind> = {
  sofa: "sofa",
  bed: "bed",
  tv: "tv_stand",
  "coffee-table": "coffee_table",
  plant: "plant",
  lamp: "floor_lamp",
  rug: "rug",
  desk: "desk",
  bookshelf: "bookshelf",
  shelf: "shelf_small",
  clock: "clock",
  cushion: "sofa",
  computer: "computer",
  monitor: "monitor",
  mailbox: "mailbox",
  telephone: "telephone",
  chair: "desk",
  wardrobe: "bookshelf",
  mirror: "clock",
  basket: "shelf_small",
  candle: "floor_lamp",
  garland: "clock",
  mug: "shelf_small",
  "snack-plate": "coffee_table",
  polaroid: "clock",
  frame: "clock",
  "frame-small": "clock",
  poster: "clock",
  gamepad: "monitor",
  remote: "monitor",
  slippers: "rug",
  "hanging-plant": "plant",
  doll: "plant",
  vase: "plant",
  magazine: "bookshelf",
  books: "bookshelf",
};

export function stickerIdToBondeeKind(typeId: string): BondeeFurnitureKind | null {
  return STICKER_TO_BONDEE[typeId] ?? null;
}

export function bondeeKindToStickerId(kind: BondeeFurnitureKind): string {
  const reverse = Object.entries(STICKER_TO_BONDEE).find(([, v]) => v === kind);
  return reverse?.[0] ?? kind;
}
