/** 중고거래 — 작품(IP) · 상품 종류 카탈로그 */

export type UsedProductTypeId =
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
  | "BOOK"
  | "MEDIA"
  | "OTHER";

export const USED_PRODUCT_TYPES: { id: UsedProductTypeId; label: string }[] = [
  { id: "FIGURE", label: "피규어" },
  { id: "PLAMODEL", label: "프라모델" },
  { id: "PLUSH", label: "인형" },
  { id: "STATUE", label: "등신대" },
  { id: "ACRYLIC_STAND", label: "아크릴 스탠드" },
  { id: "CAN_BADGE", label: "캔뱃지" },
  { id: "KEYRING", label: "키링" },
  { id: "COSPLAY_COSTUME", label: "코스프레 의상" },
  { id: "WIG", label: "가발" },
  { id: "TCG_CARD", label: "카드(TCG)" },
  { id: "BOOK", label: "만화책/라이트노벨" },
  { id: "MEDIA", label: "CD/DVD/블루레이" },
  { id: "OTHER", label: "기타" },
];

const PRODUCT_TYPE_IDS = new Set(USED_PRODUCT_TYPES.map((p) => p.id));

export function usedProductTypeLabel(id: string | null | undefined): string {
  if (!id) return "";
  return USED_PRODUCT_TYPES.find((p) => p.id === id)?.label ?? "";
}

export function isValidProductType(id: string | null | undefined): id is UsedProductTypeId {
  return !!id && PRODUCT_TYPE_IDS.has(id as UsedProductTypeId);
}

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
