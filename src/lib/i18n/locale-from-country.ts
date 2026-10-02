import type { Locale } from "@/lib/i18n/config";

/** UI locale is always English regardless of country. */
export function localeFromCountryCode(_countryCode: string | null | undefined): Locale {
  return "en";
}

/** @deprecated UI locale is always English. */
export function localeForCountry(_countryCode: string | null | undefined): Locale {
  return "en";
}
