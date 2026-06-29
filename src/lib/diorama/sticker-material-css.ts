/** RC-1 — 2D 스티커 Material Bible (CSS filter) */
import type { BondeeMaterialKind } from "@/lib/apt/style/bondee-material-bible";

export const STICKER_MATERIAL_KIND: Record<string, BondeeMaterialKind> = {
  sofa: "fabric",
  cushion: "fabric",
  rug: "fabric",
  slippers: "fabric",
  magazine: "fabric",
  books: "fabric",
  "coffee-table": "wood",
  shelf: "wood",
  desk: "wood",
  chair: "wood",
  bed: "fabric",
  tv: "plastic",
  remote: "plastic",
  gamepad: "plastic",
  mug: "plastic",
  vase: "plastic",
  plant: "plastic",
  lamp: "plastic",
  candle: "plastic",
  telephone: "plastic",
  window: "glass",
  mirror: "glass",
  frame: "wood",
  "frame-small": "wood",
};

const MATERIAL_CSS: Record<BondeeMaterialKind, string> = {
  fabric:
    "contrast(0.96) saturate(0.9) brightness(1.03) sepia(0.05)",
  wood: "contrast(0.94) saturate(0.88) brightness(1.01) sepia(0.08)",
  plastic:
    "contrast(0.95) saturate(0.92) brightness(1.02) sepia(0.04)",
  metal: "contrast(0.97) saturate(0.85) brightness(1.06) sepia(0.03)",
  wall: "contrast(0.95) saturate(0.9) brightness(1.02)",
  floor: "contrast(0.94) saturate(0.88) brightness(0.98) sepia(0.06)",
  glass: "contrast(0.98) saturate(0.8) brightness(1.08)",
};

export function materialFilterForSticker(typeId: string): string | undefined {
  const kind = STICKER_MATERIAL_KIND[typeId];
  return kind ? MATERIAL_CSS[kind] : undefined;
}
