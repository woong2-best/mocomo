import type { StickerCategory } from "./sticker-types";
import { STICKER_CATALOG } from "./sticker-catalog";
import { isStickerDraggable } from "./sticker-instance-utils";

export const PALETTE_CATEGORIES: { id: StickerCategory; label: string }[] = [
  { id: "furniture", label: "가구" },
  { id: "decor", label: "장식" },
  { id: "lighting", label: "조명" },
  { id: "prop", label: "소품" },
  { id: "functional", label: "기능 가구" },
];

const NON_DELETABLE_TYPES = new Set(["door", "window"]);

export function isEditableInEditMode(typeId: string): boolean {
  return isStickerDraggable(typeId);
}

export function canDeleteInEditMode(typeId: string): boolean {
  if (NON_DELETABLE_TYPES.has(typeId)) return false;
  return isEditableInEditMode(typeId);
}

export function getCatalogByCategory(category: StickerCategory) {
  return Object.values(STICKER_CATALOG).filter(
    (a) => a.category === category && a.id !== "room-shell"
  );
}

export function newInstanceId(typeId: string): string {
  return `${typeId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
