import { getAllUsedRegions, isValidUsedRegion, KOREA_SIDO, USED_SHIPPING_REGION } from "@/lib/korea-regions";
import { meetExternalMapUrl } from "@/lib/maps/external-url";
import type { MeetCoords } from "@/lib/maps/types";
import { formatMoney, formatUsd, MAX_USED_LISTING_PRICE_USD_CENTS } from "@/lib/money";

export type { MeetCoords } from "@/lib/maps/types";

/** 중고거래 최대 가격 (USD cents) */
export const MAX_USED_LISTING_PRICE = MAX_USED_LISTING_PRICE_USD_CENTS;
export const MAX_USED_LISTING_PRICE_LABEL = formatUsd(MAX_USED_LISTING_PRICE_USD_CENTS);

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
  return formatMoney(price, { freeLabel: "나눔" });
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
  if (status === "SELLING") return "판매중";
  return "";
}

export const USED_STATUS_OPTIONS = [
  { value: "SELLING" as const, label: "판매중" },
  { value: "RESERVED" as const, label: "예약중" },
  { value: "SOLD" as const, label: "거래완료" },
];

export function usedMapSearchUrl(
  region: string,
  meetPlace?: string | null,
  coords?: { lat: number; lng: number } | null,
  country?: string | null
) {
  return meetExternalMapUrl({
    country,
    region,
    place: meetPlace,
    coords,
  });
}

export function parseMeetCoords(
  meetLat?: number | null,
  meetLng?: number | null
): MeetCoords | null {
  if (meetLat == null || meetLng == null) return null;
  if (!Number.isFinite(meetLat) || !Number.isFinite(meetLng)) return null;
  return { lat: meetLat, lng: meetLng };
}

export function listingImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((x): x is string => typeof x === "string");
  return [];
}

export { isAuctionListing, displayAuctionPrice, formatAuctionCountdown } from "@/lib/used-auction";
export { USED_PRODUCT_TYPES, usedProductTypeLabel, sanitizeWorkTitleInput } from "@/lib/used-catalog";
