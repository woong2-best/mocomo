import { isUsedMarketEligible, usedMarketVerificationRequiredMsg } from "@/lib/used-bank-auth";
import { isKoreaUsedMarketCountry } from "@/lib/used-regions-global";
import { walletSettlementPath } from "@/lib/settlement-account";

export type UsedMarketVerifyUser = {
  countryCode: string;
  bankVerifiedAt?: Date | null;
  phoneVerified?: Date | null;
};

/** KR → bank (wallet) · overseas → phone OTP at /used/verify */
export function usedMarketVerifyPath(callbackUrl?: string, countryCode?: string): string {
  const next = callbackUrl?.startsWith("/") ? callbackUrl : "/used/new";
  if (isKoreaUsedMarketCountry(countryCode)) {
    return walletSettlementPath(next);
  }
  const params = new URLSearchParams({ callbackUrl: next });
  return `/used/verify?${params.toString()}`;
}

export function assertUsedMarketVerified(
  user: UsedMarketVerifyUser | null | undefined,
  locale: "ko" | "en" = "ko"
): { error: string; redirectTo: string } | null {
  if (!user) return null;
  if (isUsedMarketEligible(user)) return null;
  return {
    error: usedMarketVerificationRequiredMsg(user.countryCode, locale),
    redirectTo: usedMarketVerifyPath("/used/new", user.countryCode),
  };
}
