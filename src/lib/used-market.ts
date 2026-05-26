import { getAllUsedRegions, isValidUsedRegion, KOREA_SIDO, USED_SHIPPING_REGION } from "@/lib/korea-regions";

/** 중고거래 최대 가격: 21억 원 */
export const MAX_USED_LISTING_PRICE = 2_100_000_000;
export const MAX_USED_LISTING_PRICE_LABEL = "21억 원";

export const USED_CATEGORIES = [
  { id: "DIGITAL", label: "디지털/가전" },
  { id: "FIGURE", label: "피규어/프라모" },
  { id: "GOODS", label: "굿즈/콜렉" },
  { id: "COSPLAY", label: "코스프레/의상" },
  { id: "BOOK", label: "도서/음반" },
  { id: "FASHION", label: "패션/잡화" },
  { id: "OTHER", label: "기타" },
] as const;

/** 전국 시·군·구 + 전국 택배 */
export const USED_REGIONS = getAllUsedRegions();

export { KOREA_SIDO, USED_SHIPPING_REGION, isValidUsedRegion };

export function usedCategoryLabel(id: string) {
  return USED_CATEGORIES.find((c) => c.id === id)?.label ?? "기타";
}

export function formatUsedPrice(price: number) {
  if (price === 0) return "나눔";
  return `${price.toLocaleString()}원`;
}

export function formatUsedTimeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

export function usedStatusLabel(status: string) {
  if (status === "RESERVED") return "예약중";
  if (status === "SOLD") return "거래완료";
  return "";
}

export function listingImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((x): x is string => typeof x === "string");
  return [];
}
