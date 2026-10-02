import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

/**
 * OFAC country policy facade — comprehensive vs targeted tiers kept separate from Stripe lists.
 */

import {
  isOfacComprehensiveEmbargoCountry,
  isOfacComprehensiveEmbargoLocation,
  isOfacComprehensiveEmbargoRegion,
  OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_CODES,
} from "@/lib/compliance/ofac-comprehensive-embargo";
import {
  isOfacTargetedSanctionCountry,
  OFAC_TARGETED_SANCTION_COUNTRY_CODES,
  resolveOfacComplianceTier,
  type OfacComplianceTier,
} from "@/lib/compliance/ofac-targeted-sanctions";

export {
  OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_CODES,
  OFAC_TARGETED_SANCTION_COUNTRY_CODES,
  isOfacComprehensiveEmbargoCountry,
  isOfacComprehensiveEmbargoRegion,
  isOfacComprehensiveEmbargoLocation,
  isOfacTargetedSanctionCountry,
  resolveOfacComplianceTier,
  type OfacComplianceTier,
};

/** @deprecated Use OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_CODES — only comprehensive tier blocks signup */
export const OFAC_SANCTIONED_COUNTRY_CODES = OFAC_COMPREHENSIVE_EMBARGO_COUNTRY_CODES;

export type OfacSanctionedCountryCode = (typeof OFAC_SANCTIONED_COUNTRY_CODES)[number];

/** @deprecated comprehensive embargo only */
export const OFAC_SANCTIONED_COUNTRY_SET = new Set<string>(OFAC_SANCTIONED_COUNTRY_CODES);

export const OFAC_REGION_UNAVAILABLE_MESSAGE = "Service is unavailable in your region.";

export const OFAC_TARGETED_SANCTION_NOTICE_EN =
  "Enhanced compliance screening applies in your region. Stripe Connect onboarding may require additional verification.";

export const OFAC_TARGETED_SANCTION_NOTICE_KO =
  t("lib.compliance.stripe_connect");

/**
 * Signup / locale / payment geo block — comprehensive embargo only.
 * Targeted-sanction countries remain allowed at platform level (Stripe SDN at Connect).
 */
export function isOfacSanctionedCountry(code: string | null | undefined): boolean {
  return isOfacComprehensiveEmbargoCountry(code);
}

export function filterOfacAllowedCountries<T extends { code: string }>(items: T[]): T[] {
  return items.filter((item) => !isOfacComprehensiveEmbargoCountry(item.code));
}

export function assertCountrySelectable(
  code: string | null | undefined,
  regionOrState?: string | null
): { error: string } | null {
  if (isOfacComprehensiveEmbargoLocation({ countryCode: code, regionOrState })) {
    return { error: OFAC_REGION_UNAVAILABLE_MESSAGE };
  }
  return null;
}
