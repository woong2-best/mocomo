/** US OFAC / Stripe high-risk country blocklist (ISO 3166-1 alpha-2). */
export const OFAC_SANCTIONED_COUNTRY_CODES = [
  "KP",
  "IR",
  "SY",
  "CU",
  "RU",
  "BY",
  "AF",
  "MM",
  "SD",
  "YE",
  "VE",
] as const;

export type OfacSanctionedCountryCode = (typeof OFAC_SANCTIONED_COUNTRY_CODES)[number];

export const OFAC_SANCTIONED_COUNTRY_SET = new Set<string>(OFAC_SANCTIONED_COUNTRY_CODES);

export const OFAC_REGION_UNAVAILABLE_MESSAGE = "Service is unavailable in your region.";

export function isOfacSanctionedCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return OFAC_SANCTIONED_COUNTRY_SET.has(code.trim().toUpperCase());
}

export function filterOfacAllowedCountries<T extends { code: string }>(items: T[]): T[] {
  return items.filter((item) => !isOfacSanctionedCountry(item.code));
}

export function assertCountrySelectable(
  code: string | null | undefined
): { error: string } | null {
  if (isOfacSanctionedCountry(code)) {
    return { error: OFAC_REGION_UNAVAILABLE_MESSAGE };
  }
  return null;
}
