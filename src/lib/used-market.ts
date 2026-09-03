import { getAllUsedRegions, KOREA_SIDO, USED_SHIPPING_REGION } from "@/lib/korea-regions";
import {
  defaultUsedRegionForCountry,
  isKoreaUsedMarketCountry,
  isUsedShippingRegion,
  isValidUsedRegion,
  usedShippingRegionLabel,
} from "@/lib/used-regions-global";
import { meetExternalMapUrl } from "@/lib/maps/external-url";
import type { MeetCoords } from "@/lib/maps/types";
import { formatPrice, formatUsd, MAX_USED_LISTING_PRICE_KRW, MAX_USED_LISTING_PRICE_USD_CENTS } from "@/lib/money";
import { BID_INCREMENT_PRESETS } from "@/lib/used-auction";

export type { MeetCoords } from "@/lib/maps/types";

export const USED_CURRENCIES = [
  { id: "krw", label: "원 (KRW)" },
  { id: "usd", label: "달러 (USD)" },
] as const;

export type UsedCurrency = (typeof USED_CURRENCIES)[number]["id"];

export const DEFAULT_USED_CURRENCY: UsedCurrency = "krw";

export function normalizeUsedCurrency(raw?: string | null): UsedCurrency {
  return (raw ?? DEFAULT_USED_CURRENCY).toLowerCase() === "usd" ? "usd" : "krw";
}

/** @deprecated use maxUsedListingPrice(currency) */
export const MAX_USED_LISTING_PRICE = MAX_USED_LISTING_PRICE_USD_CENTS;

export function maxUsedListingPrice(currency?: string | null): number {
  return normalizeUsedCurrency(currency) === "usd"
    ? MAX_USED_LISTING_PRICE_USD_CENTS
    : MAX_USED_LISTING_PRICE_KRW;
}

export function maxUsedListingPriceLabel(currency?: string | null): string {
  const c = normalizeUsedCurrency(currency);
  return c === "usd"
    ? formatUsd(MAX_USED_LISTING_PRICE_USD_CENTS)
    : formatPrice(MAX_USED_LISTING_PRICE_KRW, "krw");
}

/** @deprecated use maxUsedListingPriceLabel(currency) */
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
export {
  defaultUsedRegionForCountry,
  isKoreaUsedMarketCountry,
  isUsedShippingRegion,
  usedShippingRegionLabel,
  USED_GLOBAL_SHIPPING_REGION,
} from "@/lib/used-regions-global";

export function usedCategoryLabel(id: string) {
  return USED_CATEGORIES.find((c) => c.id === id)?.label ?? "기타";
}

export function formatUsedPrice(price: number, currency?: string | null) {
  if (price === 0) return "나눔";
  return formatPrice(price, normalizeUsedCurrency(currency));
}

export const BID_INCREMENT_PRESETS_USD = [
  { value: 50, label: "$0.50" },
  { value: 100, label: "$1" },
  { value: 500, label: "$5" },
  { value: 1_000, label: "$10" },
  { value: 5_000, label: "$50" },
  { value: 10_000, label: "$100" },
] as const;

export function bidIncrementPresets(currency?: string | null) {
  return normalizeUsedCurrency(currency) === "usd"
    ? BID_INCREMENT_PRESETS_USD
    : BID_INCREMENT_PRESETS;
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

export { isAuctionListing, displayAuctionPrice, formatAuctionCountdown, BID_INCREMENT_PRESETS } from "@/lib/used-auction";
export { USED_PRODUCT_TYPES, usedProductTypeLabel, sanitizeWorkTitleInput } from "@/lib/used-catalog";
