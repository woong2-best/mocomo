import { COUNTRY_COOKIE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

export function setClientLocaleCookies(locale: Locale, countryCode: string) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
  document.cookie = `${COUNTRY_COOKIE}=${countryCode.toUpperCase()};path=/;max-age=${maxAge};SameSite=Lax`;
}
