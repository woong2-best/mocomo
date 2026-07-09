/**
 * Site display languages — fixed set of four (not tied to country choice).
 * - ko: Korean UI + Korean translation target
 * - en: American English UI + translation target
 * - ja: Japanese UI + translation target
 * - zh: Simplified Chinese UI + translation target
 *
 * Country (profile flag) is independent: any worldwide ISO code via COUNTRY_REGIONS.
 * User-generated posts stay in the author's language; UI strings use t() / messages.ts.
 */
export const LOCALES = ["ko", "en", "ja", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "mocomo_locale";
export const COUNTRY_COOKIE = "mocomo_country";

/** 로그인 사용자 DB 기본 locale (Prisma default) */
export const DEFAULT_USER_LOCALE: Locale = "ko";
/** 비로그인 방문자 기본값 (미국 영어) */
export const DEFAULT_GUEST_LOCALE: Locale = "en";
export const DEFAULT_GUEST_COUNTRY = "US";

/** Language picker labels (한국 · 미국 · 일본 · 중국) */
export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English (US)",
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
