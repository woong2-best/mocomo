export type UsedMarketVerifyUser = {
  countryCode: string;
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  phoneVerified?: Date | null;
};

/** @deprecated Phone verification removed — returns callback only. */
export function usedMarketVerifyPath(callbackUrl?: string, _countryCode?: string): string {
  return callbackUrl?.startsWith("/") ? callbackUrl : "/market/new";
}

/** @deprecated Phone verification removed — only checks user presence. */
export function assertUsedMarketVerified(
  user: UsedMarketVerifyUser | null | undefined
): { error: string; redirectTo: string } | null {
  if (!user) return null;
  return null;
}
