/** @deprecated Import from @/lib/subculture-commerce/catalog — kept for backward compatibility. */
export {
  type SubcultureProductTypeId as UsedProductTypeId,
  SUBCULTURE_PRODUCT_TYPES as USED_PRODUCT_TYPES,
  subcultureProductTypeLabel as usedProductTypeLabel,
  isValidSubcultureProductType as isValidProductType,
} from "@/lib/subculture-commerce/catalog";

/** 띄어쓰기·특수공백 제거 (작품명 검색·저장용) */
export function compactWorkKey(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[\s\u00A0]+/g, "").trim();
}

/** DB 저장·URL용 — 띄어쓰기 없이, 비어 있으면 null */
export function normalizeWorkTitle(input: string | null | undefined): string | null {
  const compact = compactWorkKey(input);
  if (!compact || compact === "전체작품") return null;
  return compact.slice(0, 120);
}

/** 입력 중 띄어쓰기 자동 제거 */
export function sanitizeWorkTitleInput(raw: string): string {
  return compactWorkKey(raw);
}
