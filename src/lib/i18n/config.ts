export const LOCALES = ["ko", "en", "ja", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "mocomo_locale";
export const COUNTRY_COOKIE = "mocomo_country";

/** 비로그인 방문자 기본값 */
export const DEFAULT_GUEST_LOCALE: Locale = "en";
export const DEFAULT_GUEST_COUNTRY = "US";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

export {
  COUNTRIES,
  COUNTRY_REGIONS,
  countryDisplayName,
  isKnownCountryCode,
  regionLabel,
  type CountryEntry,
  type CountryRegion,
} from "@/lib/i18n/countries";

export function countryFlag(code: string): string {
  const c = code.toUpperCase();
  if (c === "OTHER" || c.length !== 2) return "🌐";
  const points = [...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65);
  return String.fromCodePoint(...points);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value?: string | null, fallback: Locale = "ko"): Locale {
  if (value && isLocale(value)) return value;
  return fallback;
}
