import { assertUsedMarketCountryAllowed, isKoreaUsedMarketCountry } from "@/lib/used-regions-global";
import { ERROR_CODES } from "@/lib/error-codes";
import { translate } from "@/lib/i18n/messages";
import { usedMarketVerificationRequiredMsg } from "@/lib/used-bank-auth";

export const USED_MARKET_BAN_MESSAGE = translate("en", ERROR_CODES.usedMarketBanned);

export const USED_MARKET_BAN_APPEAL_HINT = translate("en", "used.market.banAppealHint");

/** @deprecated use USED_BANK_REQUIRED_MSG or USED_PHONE_REQUIRED_MSG */
export { USED_BANK_REQUIRED_MSG as USED_PHONE_REQUIRED_MSG } from "@/lib/used-bank-auth";

export type UsedMarketUserSlice = {
  countryCode: string;
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  phoneVerified?: Date | null;
  usedMarketBannedAt?: Date | null;
  adultVerifiedAt?: Date | null;
};

export function isUsedMarketBanned(user: { usedMarketBannedAt?: Date | null }): boolean {
  return !!user.usedMarketBannedAt;
}

export function assertUsedMarketNotBanned(user: UsedMarketUserSlice): string | null {
  if (isUsedMarketBanned(user)) return ERROR_CODES.usedMarketBanned;
  return null;
}

/** 직거래·Auction 공통 — KR 정산 계좌 불필요, 해외 휴대폰 인증, Auction 보증금은 MOCO 별도 */
function assertUsedListingActivityAccess(user: UsedMarketUserSlice): string | null {
  const banErr = assertUsedMarketNotBanned(user);
  if (banErr) return banErr;
  const regionErr = assertUsedMarketCountryAllowed(user.countryCode);
  if (regionErr) return regionErr;
  if (!isKoreaUsedMarketCountry(user.countryCode) && !user.phoneVerified) {
    return usedMarketVerificationRequiredMsg(user.countryCode);
  }
  return null;
}

export function assertUsedMarketAccess(user: UsedMarketUserSlice): string | null {
  return assertUsedListingActivityAccess(user);
}

/** @deprecated assertUsedMarketAccess 와 동일 */
export function assertAuctionPostAccess(user: UsedMarketUserSlice): string | null {
  return assertUsedListingActivityAccess(user);
}
