import { isUsedMarketEligible, usedMarketVerificationRequiredMsg } from "@/lib/used-bank-auth";
import { isKoreaUsedMarketCountry } from "@/lib/used-regions-global";
export type UsedMarketVerifyUser = {
  countryCode: string;
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  phoneVerified?: Date | null;
};

/** KR 직거래 — 별도 정산 연동 없음 · 해외 → phone OTP at /market/verify */
export function usedMarketVerifyPath(callbackUrl?: string, countryCode?: string): string {
  const next = callbackUrl?.startsWith("/") ? callbackUrl : "/market/new";
  if (isKoreaUsedMarketCountry(countryCode)) {
    return next;
  }
  const params = new URLSearchParams({ callbackUrl: next });
  return `/market/verify?${params.toString()}`;
}

export function assertUsedMarketVerified(
  user: UsedMarketVerifyUser | null | undefined,
  locale: "ko" | "en" = "ko"
): { error: string; redirectTo: string } | null {
  if (!user) return null;
  if (isUsedMarketEligible(user)) return null;
  return {
    error: usedMarketVerificationRequiredMsg(user.countryCode, locale),
    redirectTo: usedMarketVerifyPath("/market/new", user.countryCode),
  };
}
