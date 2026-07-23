import { DEFAULT_GUEST_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

/** DB / guest fallback — never derive “today” from country alone. */
export const DEFAULT_TIMEZONE = "UTC";
export const TIMEZONE_COOKIE = "mocomo_timezone";

/** Common IANA zones for settings/signup pickers (not exhaustive). */
export const COMMON_TIMEZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Vladivostok",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

/** Best-effort country guess from IANA zone (signup prefill only). */
const TIMEZONE_COUNTRY_HINTS: Record<string, string> = {
  "Asia/Seoul": "KR",
  "Asia/Tokyo": "JP",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Taipei": "TW",
  "Asia/Singapore": "SG",
  "Asia/Bangkok": "TH",
  "Asia/Jakarta": "ID",
  "Asia/Kolkata": "IN",
  "Asia/Dubai": "AE",
  "Asia/Vladivostok": "RU",
  "Europe/Moscow": "RU",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Sao_Paulo": "BR",
  "America/Manaus": "BR",
  "America/Mexico_City": "MX",
  "America/Argentina/Buenos_Aires": "AR",
  "Australia/Sydney": "AU",
  "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
};

export function isValidTimeZone(value: string | null | undefined): boolean {
  if (!value || value.length > 64) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(
  value?: string | null,
  fallback: string = DEFAULT_TIMEZONE
): string {
  const trimmed = value?.trim();
  if (trimmed && isValidTimeZone(trimmed)) return trimmed;
  return isValidTimeZone(fallback) ? fallback : DEFAULT_TIMEZONE;
}

/** Browser IANA zone via Intl (client only). */
export function detectBrowserTimeZone(): string {
  if (typeof Intl === "undefined") return DEFAULT_TIMEZONE;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return normalizeTimeZone(tz);
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Map navigator.language → site Locale (ko/en/ja/zh). */
export function detectBrowserLocale(fallback: Locale = DEFAULT_GUEST_LOCALE): Locale {
  if (typeof navigator === "undefined") return fallback;
  const raw = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("zh")) return "zh";
  if (raw.startsWith("en") && isLocale("en")) return "en";
  return fallback;
}

export function guessCountryFromTimeZone(timeZone: string): string | null {
  return TIMEZONE_COUNTRY_HINTS[normalizeTimeZone(timeZone)] ?? null;
}

export type CivilDateParts = { y: number; m: number; d: number };

/** “Today” in an IANA zone (not device local, not country-derived). */
export function todayPartsInTimeZone(timeZone: string): CivilDateParts {
  const tz = normalizeTimeZone(timeZone);
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = formatted.split("-").map(Number);
  return { y, m, d };
}

export function listTimeZonesForPicker(): string[] {
  try {
    const supported =
      typeof Intl !== "undefined" &&
      "supportedValuesOf" in Intl &&
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : null;
    if (supported?.length) return supported;
  } catch {
    /* fall through */
  }
  return [...COMMON_TIMEZONES];
}

/** Signup/settings: detect browser locale + country hint + timezone together. */
export function detectBrowserRegionPrefs(): {
  locale: Locale;
  countryCode: string | null;
  timeZone: string;
} {
  const timeZone = detectBrowserTimeZone();
  return {
    locale: detectBrowserLocale(),
    countryCode: guessCountryFromTimeZone(timeZone),
    timeZone,
  };
}
