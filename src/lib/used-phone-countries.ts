import { isOfacSanctionedCountry } from "@/lib/compliance/ofac-sanctioned-countries";
import { ALLOWED_COUNTRIES } from "@/lib/i18n/countries";
import type { Locale } from "@/lib/i18n/config";

/** 중고거래 휴대폰 인증 지원 — OFAC 제재국 제외 전 세계 */
export function isUsedMarketPhoneCountry(countryCode: string): boolean {
  const cc = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return false;
  return !isOfacSanctionedCountry(cc);
}

export const USED_MARKET_PHONE_COUNTRY_CODES = new Set(
  ALLOWED_COUNTRIES.map((c) => c.code.toUpperCase())
);

export function usedMarketPhoneCountryLabel(countryCode: string, locale: Locale = "ko") {
  const cc = countryCode.toUpperCase();
  const entry = ALLOWED_COUNTRIES.find((c) => c.code.toUpperCase() === cc);
  if (!entry) {
    return locale === "ko" ? "지원 국가" : "Supported country";
  }
  if (locale === "ko") return entry.nameKo;
  return entry.nameEn;
}
