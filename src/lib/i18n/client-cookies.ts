import { COUNTRY_COOKIE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { TIMEZONE_COOKIE, normalizeTimeZone } from "@/lib/i18n/timezone";

export function setClientLocaleCookies(
  locale: Locale,
  countryCode: string,
  timeZone?: string | null
) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
  document.cookie = `${COUNTRY_COOKIE}=${countryCode.toUpperCase()};path=/;max-age=${maxAge};SameSite=Lax`;
  if (timeZone != null && timeZone !== "") {
    const tz = normalizeTimeZone(timeZone);
    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)};path=/;max-age=${maxAge};SameSite=Lax`;
  }
}
