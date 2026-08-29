import {
  isUsedMarketEligible,
  USED_BANK_REQUIRED_MSG,
  usedMarketUnsupportedCountryMsg,
} from "@/lib/used-bank-auth";

export const USED_MARKET_BAN_MESSAGE =
  "경매 낙찰 후 결제를 완료하지 않아 중고거래 이용이 제한되었습니다. 경매는 판매자와 다른 입찰자에게 큰 피해를 줄 수 있으므로, 낙찰 후 결제 의무를 반드시 이행해야 합니다.";

export const USED_MARKET_BAN_APPEAL_HINT =
  "시스템 오류, 판매자의 부당한 요청 등 정당한 사유가 있는 경우 제재 통지일로부터 7일 이내에 이의 신청을 제출할 수 있습니다.";

/** @deprecated use USED_BANK_REQUIRED_MSG */
export const USED_PHONE_REQUIRED_MSG = USED_BANK_REQUIRED_MSG;

export type UsedMarketUserSlice = {
  countryCode: string;
  bankVerifiedAt?: Date | null;
  phoneVerified?: Date | null;
  usedMarketBannedAt?: Date | null;
  adultVerifiedAt?: Date | null;
};

export function isUsedMarketBanned(user: { usedMarketBannedAt?: Date | null }): boolean {
  return !!user.usedMarketBannedAt;
}

export function assertUsedMarketNotBanned(user: UsedMarketUserSlice): string | null {
  if (isUsedMarketBanned(user)) return USED_MARKET_BAN_MESSAGE;
  return null;
}

export function assertUsedMarketAccess(user: UsedMarketUserSlice): string | null {
  const banErr = assertUsedMarketNotBanned(user);
  if (banErr) return banErr;
  if (user.countryCode.toUpperCase() !== "KR") return usedMarketUnsupportedCountryMsg("ko");
  if (!isUsedMarketEligible(user)) return USED_BANK_REQUIRED_MSG;
  return null;
}
