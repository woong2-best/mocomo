/**
 * OFAC comprehensive embargo — full country/region block (signup, payments, market).
 * Wyoming US-person entity: block before Stripe onboarding to save review resources.
 */

/** ISO 3166-1 alpha-2 — comprehensive embargo (2026 OFAC) */
export const OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_CODES = [
  "KP",
  "IR",
  "SY",
  "CU",
] as const;

export type OfacComprehensiveEmbargoCountryCode =
  (typeof OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_CODES)[number];

export const OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_SET = new Set<string>(
  OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_CODES
);

/** Ukraine occupied territories — region/subdivision match (ISO 3166-2 + common names) */
export const OFAC_UA_OCCUPIED_REGION_TOKENS = [
  "crimea",
  "sevastopol",
  "donetsk",
  "luhansk",
  "donets",
  "lugansk",
  "ua-43",
  "ua-40",
  "ua-14",
  "ua-09",
  "43",
  "40",
  "14",
  "09",
] as const;

export function normalizeRegionToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isOfacComprehensiveEmbargoCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_SET.has(code.trim().toUpperCase());
}

/** UA country with occupied subregion → treat as comprehensive embargo */
export function isOfacComprehensiveEmbargoRegion(
  countryCode: string | null | undefined,
  regionOrState?: string | null
): boolean {
  const country = (countryCode ?? "").trim().toUpperCase();
  if (country !== "UA") return false;
  const region = normalizeRegionToken(regionOrState);
  if (!region) return false;
  return OFAC_UA_OCCUPIED_REGION_TOKENS.some(
    (token) => region === token || region.includes(token)
  );
}

export function isOfacComprehensiveEmbargoLocation(input: {
  countryCode?: string | null;
  regionOrState?: string | null;
}): boolean {
  if (isOfacComprehensiveEmbargoCountry(input.countryCode)) return true;
  return isOfacComprehensiveEmbargoRegion(input.countryCode, input.regionOrState);
}
