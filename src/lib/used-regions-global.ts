import type { Locale } from "@/lib/i18n/config";
import { isOfacSanctionedCountry } from "@/lib/compliance/ofac-sanctioned-countries";
import {
  formatUsedRegion,
  getAllUsedRegions,
  getSigunguList,
  isValidUsedRegion as isValidKoreaUsedRegion,
  KOREA_SIDO,
  parseUsedRegion,
  USED_SHIPPING_REGION,
} from "@/lib/korea-regions";
import { findCountry as findWorldCountry } from "@/lib/apt/world/world-countries";

/** Legacy KR shipping label — kept for DB backward compatibility */
export { USED_SHIPPING_REGION };

export const USED_GLOBAL_SHIPPING_REGION = "Shipping" as const;

const SHIPPING_REGION_LABELS = new Set([
  USED_SHIPPING_REGION,
  USED_GLOBAL_SHIPPING_REGION,
  "Shipping worldwide",
  "全国配送",
  "全国配送（邮寄）",
  "Envío",
  "Versand",
  "Livraison",
]);

export function isUsedShippingRegion(region: string): boolean {
  return SHIPPING_REGION_LABELS.has(region.trim());
}

export function usedShippingRegionLabel(locale: Locale = "ko"): string {
  if (locale === "en") return USED_GLOBAL_SHIPPING_REGION;
  if (locale === "ja") return "全国配送";
  if (locale === "zh" || locale === "zh-TW") return "全国配送（邮寄）";
  return USED_SHIPPING_REGION;
}

export function normalizeUsedMarketCountry(countryCode?: string | null): string {
  const c = (countryCode ?? "KR").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : "KR";
}

export function isKoreaUsedMarketCountry(countryCode?: string | null): boolean {
  return normalizeUsedMarketCountry(countryCode) === "KR";
}

export function isValidGlobalUsedRegion(region: string): boolean {
  const trimmed = region.trim();
  if (!trimmed) return false;
  if (isUsedShippingRegion(trimmed)) return true;
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  return /^[\p{L}\p{N}\s,.\-'/()&]+$/u.test(trimmed);
}

export function isValidUsedRegion(region: string, countryCode?: string | null): boolean {
  const trimmed = region.trim();
  if (isUsedShippingRegion(trimmed)) return true;
  if (isKoreaUsedMarketCountry(countryCode)) {
    return isValidKoreaUsedRegion(trimmed);
  }
  return isValidGlobalUsedRegion(trimmed);
}

export function defaultUsedRegionForCountry(countryCode?: string | null): string {
  if (isKoreaUsedMarketCountry(countryCode)) {
    const first = KOREA_SIDO[0];
    const sigungu = getSigunguList(first.id)[0] ?? "종로구";
    return formatUsedRegion(first.short, sigungu);
  }
  return USED_GLOBAL_SHIPPING_REGION;
}

export function getCountryMapCenter(countryCode?: string | null): {
  lat: number;
  lng: number;
  zoom: number;
} {
  const cc = normalizeUsedMarketCountry(countryCode);
  const world = findWorldCountry(cc);
  if (world) {
    return { lat: world.lat, lng: world.lng, zoom: cc === "KR" ? 11 : 6 };
  }
  return { lat: 20, lng: 0, zoom: 2 };
}

export function getRegionMapCenter(
  region: string,
  countryCode?: string | null
): { lat: number; lng: number; zoom: number } {
  const trimmed = region.trim();
  if (isUsedShippingRegion(trimmed)) {
    return getCountryMapCenter(countryCode);
  }
  if (isKoreaUsedMarketCountry(countryCode)) {
    const parsed = parseUsedRegion(trimmed);
    if (parsed?.sidoId && parsed.sidoId !== "__shipping__") {
      return SIDO_CENTER[parsed.sidoId] ?? getCountryMapCenter("KR");
    }
  }
  return getCountryMapCenter(countryCode);
}

export function isShippingOnlyRegion(region: string): boolean {
  return isUsedShippingRegion(region);
}

export function listUsedRegionsForCountry(countryCode?: string | null): string[] {
  if (isKoreaUsedMarketCountry(countryCode)) {
    return getAllUsedRegions();
  }
  return [USED_GLOBAL_SHIPPING_REGION];
}

export function assertUsedMarketCountryAllowed(countryCode?: string | null): string | null {
  const cc = normalizeUsedMarketCountry(countryCode);
  if (isOfacSanctionedCountry(cc)) {
    return "해당 지역에서는 중고거래를 이용할 수 없습니다.";
  }
  return null;
}

/** 시·도 대표 좌표 (지도 초기 중심 — 한국) */
export const SIDO_CENTER: Record<string, { lat: number; lng: number; zoom: number }> = {
  seoul: { lat: 37.5665, lng: 126.978, zoom: 11 },
  busan: { lat: 35.1796, lng: 129.0756, zoom: 11 },
  daegu: { lat: 35.8714, lng: 128.6014, zoom: 11 },
  incheon: { lat: 37.4563, lng: 126.7052, zoom: 11 },
  gwangju: { lat: 35.1595, lng: 126.8526, zoom: 11 },
  daejeon: { lat: 36.3504, lng: 127.3845, zoom: 11 },
  ulsan: { lat: 35.5384, lng: 129.3114, zoom: 11 },
  sejong: { lat: 36.48, lng: 127.289, zoom: 12 },
  gyeonggi: { lat: 37.4138, lng: 127.5183, zoom: 10 },
  gangwon: { lat: 37.8228, lng: 128.1555, zoom: 9 },
  chungbuk: { lat: 36.6357, lng: 127.4912, zoom: 10 },
  chungnam: { lat: 36.5184, lng: 126.8, zoom: 10 },
  jeonbuk: { lat: 35.8242, lng: 127.148, zoom: 10 },
  jeonnam: { lat: 34.8679, lng: 126.991, zoom: 9 },
  gyeongbuk: { lat: 36.4919, lng: 128.8889, zoom: 9 },
  gyeongnam: { lat: 35.4606, lng: 128.2132, zoom: 10 },
  jeju: { lat: 33.4996, lng: 126.5312, zoom: 10 },
};
