/**
 * OFAC targeted / sectoral sanctions — signup allowed; Stripe Connect SDN screening at onboarding.
 * Do NOT use for blanket country blocks — use comprehensive embargo for that.
 */

import { isOfacComprehensiveEmbargoLocation } from "@/lib/compliance/ofac-comprehensive-embargo";

/** ISO 3166-1 alpha-2 — targeted programs (maintain separately from Stripe list) */
export const OFAC_TARGETED_SANCTION_COUNTRY_CODES = [
  "RU",
  "BY",
  "VE",
  "AF",
  "MM",
  "SD",
  "SS",
  "YE",
  "NI",
  "SO",
  "CD",
  "HT",
  "IQ",
  "LB",
] as const;

export const OFAC_TARGETED_SANCTION_COUNTRY_SET = new Set<string>(
  OFAC_TARGETED_SANCTION_COUNTRY_CODES
);

export function isOfacTargetedSanctionCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return OFAC_TARGETED_SANCTION_COUNTRY_SET.has(code.trim().toUpperCase());
}

export type OfacComplianceTier = "comprehensive" | "targeted" | "none";

export function resolveOfacComplianceTier(
  countryCode: string | null | undefined,
  regionOrState?: string | null
): OfacComplianceTier {
  if (isOfacComprehensiveEmbargoLocation({ countryCode, regionOrState })) {
    return "comprehensive";
  }
  if (isOfacTargetedSanctionCountry(countryCode)) return "targeted";
  return "none";
}
