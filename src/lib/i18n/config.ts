/** Site UI is English-only; other languages via browser translation. */
export const LOCALES = ["en"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "mocomo_locale";
export const COUNTRY_COOKIE = "mocomo_country";
export { TIMEZONE_COOKIE, DEFAULT_TIMEZONE } from "@/lib/i18n/timezone";

export const DEFAULT_USER_LOCALE: Locale = "en";
export const DEFAULT_GUEST_LOCALE: Locale = "en";
export const DEFAULT_GUEST_COUNTRY = "US";

export function localeDisplayLabel(code: Locale): string {
  return code === "en" ? "English" : code;
}

export const LOCALE_LABELS: Record<Locale, string> = { en: "English" };

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
  return value === "en";
}

export function normalizeLocale(value?: string | null, fallback: Locale = "en"): Locale {
  if (value === "en") return "en";
  return fallback;
}
