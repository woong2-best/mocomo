import { isOfacSanctionedCountry } from "@/lib/compliance/ofac-sanctioned-countries";
import { ERROR_CODES } from "@/lib/error-codes";
import { isKoreaUsedMarketCountry, normalizeUsedMarketCountry } from "@/lib/used-regions-global";

/** Used marketplace eligibility: KR needs no extra step; everywhere else needs SMS phone verification. */
export function isUsedMarketEligible(user: {
  countryCode: string;
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  phoneVerified?: Date | null;
}): boolean {
  const cc = normalizeUsedMarketCountry(user.countryCode);
  if (isOfacSanctionedCountry(cc)) return false;
  if (isKoreaUsedMarketCountry(cc)) {
    return true;
  }
  return !!user.phoneVerified;
}

/** Error code (en.json key) for "phone verification required". */
export const USED_BANK_REQUIRED_MSG = ERROR_CODES.usedPhoneVerificationRequired;
export const USED_PHONE_REQUIRED_MSG = ERROR_CODES.usedPhoneVerificationRequired;
export const USED_PHONE_REQUIRED_MSG_LEGACY = USED_BANK_REQUIRED_MSG;

export function usedBankRequiredMsg() {
  return usedPhoneRequiredMsg();
}

export function usedPhoneRequiredMsg() {
  return ERROR_CODES.usedPhoneVerificationRequired;
}

export function usedMarketVerificationRequiredMsg(countryCode: string) {
  if (isKoreaUsedMarketCountry(countryCode)) {
    return usedMarketBlockedRegionMsg();
  }
  return usedPhoneRequiredMsg();
}

/** @deprecated */
export function usedPhoneRequiredMsgLegacy(countryCode: string) {
  return usedMarketVerificationRequiredMsg(countryCode);
}

export function usedMarketBlockedRegionMsg() {
  return ERROR_CODES.usedRegionUnavailable;
}

/** @deprecated global marketplace; kept for legacy imports */
export function usedMarketUnsupportedCountryMsg() {
  return usedMarketBlockedRegionMsg();
}

/** @deprecated */
export const USED_KR_ONLY_MSG = usedMarketBlockedRegionMsg();

/** @deprecated use isUsedMarketEligible */
export function isBankVerifiedForUsed(user: {
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  phoneVerified?: Date | null;
  countryCode?: string;
}): boolean {
  if (!user.countryCode) return !!user.phoneVerified;
  return isUsedMarketEligible({
    countryCode: user.countryCode,
    stripeOnboardingCompleted: user.stripeOnboardingCompleted,
    stripeConnectOnboardedAt: user.stripeConnectOnboardedAt,
    phoneVerified: user.phoneVerified,
  });
}
