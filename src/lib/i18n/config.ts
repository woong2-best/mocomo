import fs from "node:fs";
import path from "node:path";

/** Global UI locales — static translations in src/lib/i18n/locales/{code}.json */
export const LOCALES = [
  "ko",
  "en",
  "ja",
  "zh",
  "zh-TW",
  "el",
  "fr",
  "de",
  "es",
  "pt",
  "pt-BR",
  "it",
  "nl",
  "pl",
  "ru",
  "uk",
  "ar",
  "he",
  "tr",
  "fa",
  "hi",
  "bn",
  "ta",
  "te",
  "mr",
  "ur",
  "th",
  "vi",
  "id",
  "ms",
  "fil",
  "sw",
  "sv",
  "no",
  "da",
  "fi",
  "cs",
  "sk",
  "hu",
  "ro",
  "bg",
  "hr",
  "sr",
  "sl",
  "lt",
  "lv",
  "et",
  "sq",
  "mk",
  "ca",
  "eu",
  "gl",
  "is",
  "ga",
  "cy",
  "af",
  "am",
  "az",
  "be",
  "bs",
  "ka",
  "kk",
  "km",
  "lo",
  "mn",
  "my",
  "ne",
  "si",
  "uz",
  "hy",
  "mt",
  "lb",
  "pa",
  "ha",
  "yo",
  "ig",
  "zu",
  "eo",
] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "mocomo_locale";
export const COUNTRY_COOKIE = "mocomo_country";
export { TIMEZONE_COOKIE, DEFAULT_TIMEZONE } from "@/lib/i18n/timezone";

export const DEFAULT_USER_LOCALE: Locale = "ko";
export const DEFAULT_GUEST_LOCALE: Locale = "en";
export const DEFAULT_GUEST_COUNTRY = "US";

const labelCache = new Map<string, string>();

/** Native language name for picker (e.g. el → Ελληνικά). */
export function localeDisplayLabel(code: Locale, uiLocale: Locale = "en"): string {
  const cacheKey = `${code}:${uiLocale}`;
  if (labelCache.has(cacheKey)) return labelCache.get(cacheKey)!;
  try {
    const dn = new Intl.DisplayNames([uiLocale], { type: "language" });
    const label = dn.of(code) ?? code;
    labelCache.set(cacheKey, label);
    return label;
  } catch {
    return code;
  }
}

export const LOCALE_LABELS: Record<Locale, string> = Object.fromEntries(
  LOCALES.map((l) => [l, localeDisplayLabel(l, l)])
) as Record<Locale, string>;

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
