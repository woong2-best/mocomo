import { COUNTRY_REGIONS } from "@/lib/i18n/countries";
import type { Locale } from "@/lib/i18n/config";

const europeCodes =
  COUNTRY_REGIONS.find((r) => r.id === "europe")?.countries.map((c) => c.code) ?? [];

/** 중고거래 휴대폰 인증 지원 국가 — KR · US · JP · CN · GB · 유럽 전역 */
export const USED_MARKET_PHONE_COUNTRY_CODES = new Set<string>([
  "KR",
  "US",
  "JP",
  "CN",
  "GB",
  ...europeCodes,
]);

export function isUsedMarketPhoneCountry(countryCode: string): boolean {
  return USED_MARKET_PHONE_COUNTRY_CODES.has(countryCode.toUpperCase());
}

export function usedMarketPhoneCountryLabel(countryCode: string, locale: Locale = "ko") {
  if (locale === "ko") {
    if (countryCode === "KR") return "대한민국";
    if (countryCode === "US") return "미국";
    if (countryCode === "JP") return "일본";
    if (countryCode === "CN") return "중국";
    if (countryCode === "GB") return "영국";
    return "유럽·지원 국가";
  }
  if (countryCode === "KR") return "South Korea";
  if (countryCode === "US") return "United States";
  if (countryCode === "JP") return "Japan";
  if (countryCode === "CN") return "China";
  if (countryCode === "GB") return "United Kingdom";
  return "supported countries";
}
