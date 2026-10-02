/** @deprecated Import from @/lib/subculture-commerce/catalog — kept for backward compatibility. */
export {
  type SubcultureProductTypeId as UsedProductTypeId,
  SUBCULTURE_PRODUCT_TYPES as USED_PRODUCT_TYPES,
  subcultureProductTypeLabel as usedProductTypeLabel,
  isValidSubcultureProductType as isValidProductType,
} from "@/lib/subculture-commerce/catalog";

/** 글쓰기 상품 종류 — 앱 UsedCreateScreen과 동일. */
export const USED_SELL_KINDS = [
  { id: "FIGURE", label: "Figures" },
  { id: "TCG", label: "TCG" },
  { id: "GOODS", label: "Goods" },
  { id: "BOOK", label: "Books" },
  { id: "COSPLAY", label: "Cosplay" },
  { id: "DIGITAL", label: "Digital" },
] as const;

export const USED_CONDITION_OPTIONS = [
  { id: "NEW", label: "NEW" },
  { id: "NM", label: "NM" },
  { id: "LP", label: "LP" },
  { id: "MP", label: "MP" },
  { id: "HP", label: "HP" },
  { id: "POOR", label: "DMG" },
] as const;

export function productTypeForSellKind(kind: string): string | undefined {
  const id = kind.toUpperCase();
  if (id === "FIGURE") return "FIGURE";
  if (id === "TCG") return "TCG_CARD";
  if (id === "BOOK") return "BOOK";
  if (id === "COSPLAY") return "COSPLAY_COSTUME";
  if (id === "GOODS" || id === "DIGITAL") return "OTHER";
  return undefined;
}

/** 띄어쓰기·특수공백 제거 (작품명 검색·저장용) */
export function compactWorkKey(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[\s\u00A0]+/g, "").trim();
}

/** DB 저장·URL용 — 띄어쓰기 없이, 비어 있으면 null */
export function normalizeWorkTitle(input: string | null | undefined): string | null {
  const compact = compactWorkKey(input);
  // Legacy value stored by older clients (Korean "all works"); kept as \u escapes.
  if (!compact || compact === "\uC804\uCCB4\uC791\uD488") return null;
  return compact.slice(0, 120);
}

/** 입력 중 띄어쓰기 자동 제거 */
export function sanitizeWorkTitleInput(raw: string): string {
  return compactWorkKey(raw);
}
