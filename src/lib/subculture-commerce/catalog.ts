/** Expanded product types for subculture C2C / marketplace. */

export type SubcultureProductTypeId =
  | "FIGURE"
  | "PLAMODEL"
  | "PLUSH"
  | "STATUE"
  | "ACRYLIC_STAND"
  | "CAN_BADGE"
  | "KEYRING"
  | "COSPLAY_COSTUME"
  | "WIG"
  | "TCG_CARD"
  | "TCG_POKEMON"
  | "TCG_YGO"
  | "TCG_MTG"
  | "TCG_ONEPIECE"
  | "TCG_OTHER"
  | "PHOTOCARD"
  | "DOUJIN"
  | "ARTBOOK"
  | "BOARDGAME"
  | "VTUBER_GOODS"
  | "EVENT_GOODS"
  | "BOOK"
  | "MEDIA"
  | "OTHER";

export type SubcultureProductFamily =
  | "tcg"
  | "photocard"
  | "figure"
  | "goods"
  | "cosplay"
  | "doujin"
  | "media"
  | "other";

export const SUBCULTURE_PRODUCT_TYPES: {
  id: SubcultureProductTypeId;
  label: string;
  family: SubcultureProductFamily;
}[] = [
  { id: "FIGURE", label: "Figures", family: "figure" },
  { id: "PLAMODEL", label: "Plastic models", family: "figure" },
  { id: "PLUSH", label: "Dolls & plush", family: "goods" },
  { id: "STATUE", label: "Statues & figures", family: "figure" },
  { id: "ACRYLIC_STAND", label: "Acrylic stands", family: "goods" },
  { id: "CAN_BADGE", label: "Can badges", family: "goods" },
  { id: "KEYRING", label: "Keychains & key holders", family: "goods" },
  { id: "COSPLAY_COSTUME", label: "Cosplay costumes", family: "cosplay" },
  { id: "WIG", label: "Wigs", family: "cosplay" },
  { id: "TCG_CARD", label: "Cards (TCG & general)", family: "tcg" },
  { id: "TCG_POKEMON", label: "Pokemon cards", family: "tcg" },
  { id: "TCG_YGO", label: "Yu-Gi-Oh!", family: "tcg" },
  { id: "TCG_MTG", label: "Magic (MTG)", family: "tcg" },
  { id: "TCG_ONEPIECE", label: "One Piece Card Game", family: "tcg" },
  { id: "TCG_OTHER", label: "Other TCG", family: "tcg" },
  { id: "PHOTOCARD", label: "Photocards (K-pop & idols)", family: "photocard" },
  { id: "DOUJIN", label: "Doujinshi", family: "doujin" },
  { id: "ARTBOOK", label: "Art books", family: "doujin" },
  { id: "BOARDGAME", label: "Board games & TRPG", family: "other" },
  { id: "VTUBER_GOODS", label: "VTuber & streamer merch", family: "goods" },
  { id: "EVENT_GOODS", label: "Event & limited merch", family: "goods" },
  { id: "BOOK", label: "Manga & light novels", family: "media" },
  { id: "MEDIA", label: "CD/DVD/Blu-ray", family: "media" },
  { id: "OTHER", label: "Other", family: "other" },
];

const PRODUCT_TYPE_IDS = new Set(SUBCULTURE_PRODUCT_TYPES.map((p) => p.id));

export function subcultureProductTypeLabel(id: string | null | undefined): string {
  if (!id) return "";
  return SUBCULTURE_PRODUCT_TYPES.find((p) => p.id === id)?.label ?? id;
}

export function isValidSubcultureProductType(
  id: string | null | undefined
): id is SubcultureProductTypeId {
  return !!id && PRODUCT_TYPE_IDS.has(id as SubcultureProductTypeId);
}

export function subcultureProductFamily(
  productType: string | null | undefined
): SubcultureProductFamily {
  if (!productType) return "other";
  return (
    SUBCULTURE_PRODUCT_TYPES.find((p) => p.id === productType)?.family ?? "other"
  );
}

export function isTcgProductType(productType: string | null | undefined): boolean {
  return subcultureProductFamily(productType) === "tcg";
}

export function isPhotocardProductType(productType: string | null | undefined): boolean {
  return subcultureProductFamily(productType) === "photocard";
}
