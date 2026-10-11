import { assertUsedMarketCountryAllowed } from "@/lib/used-regions-global";
import { ERROR_CODES } from "@/lib/error-codes";
import { translate } from "@/lib/i18n/messages";

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

/** 직거래·Auction 공통 — 국가·밴·OFAC만 검사 (휴대폰 인증 없음) */
function assertUsedListingActivityAccess(user: UsedMarketUserSlice): string | null {
  const banErr = assertUsedMarketNotBanned(user);
  if (banErr) return banErr;
  const regionErr = assertUsedMarketCountryAllowed(user.countryCode);
  if (regionErr) return regionErr;
  return null;
}

export function assertUsedMarketAccess(user: UsedMarketUserSlice): string | null {
  return assertUsedListingActivityAccess(user);
}

/** @deprecated assertUsedMarketAccess 와 동일 */
export function assertAuctionPostAccess(user: UsedMarketUserSlice): string | null {
  return assertUsedListingActivityAccess(user);
}
