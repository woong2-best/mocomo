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
  { id: "FIGURE", label: "피규어", family: "figure" },
  { id: "PLAMODEL", label: "프라모델", family: "figure" },
  { id: "PLUSH", label: "인형·봉제", family: "goods" },
  { id: "STATUE", label: "등신대·스태츄", family: "figure" },
  { id: "ACRYLIC_STAND", label: "아크릴 스탠드", family: "goods" },
  { id: "CAN_BADGE", label: "캔뱃지", family: "goods" },
  { id: "KEYRING", label: "키링·키홀더", family: "goods" },
  { id: "COSPLAY_COSTUME", label: "코스프레 의상", family: "cosplay" },
  { id: "WIG", label: "가발", family: "cosplay" },
  { id: "TCG_CARD", label: "카드 (TCG·일반)", family: "tcg" },
  { id: "TCG_POKEMON", label: "포켓몬 카드", family: "tcg" },
  { id: "TCG_YGO", label: "유희왕", family: "tcg" },
  { id: "TCG_MTG", label: "매직 (MTG)", family: "tcg" },
  { id: "TCG_ONEPIECE", label: "원피스 카드", family: "tcg" },
  { id: "TCG_OTHER", label: "기타 TCG", family: "tcg" },
  { id: "PHOTOCARD", label: "포토카드 (K-pop·아이돌)", family: "photocard" },
  { id: "DOUJIN", label: "동인지·同人", family: "doujin" },
  { id: "ARTBOOK", label: "아트북·画集", family: "doujin" },
  { id: "BOARDGAME", label: "보드게임·TRPG", family: "other" },
  { id: "VTUBER_GOODS", label: "VTuber·스트리머 굿즈", family: "goods" },
  { id: "EVENT_GOODS", label: "행사·한정 굿즈", family: "goods" },
  { id: "BOOK", label: "만화·라노벨", family: "media" },
  { id: "MEDIA", label: "CD/DVD/블루레이", family: "media" },
  { id: "OTHER", label: "기타", family: "other" },
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
