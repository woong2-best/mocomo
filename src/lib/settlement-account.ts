export const SETTLEMENT_ACCOUNT_REQUIRED_MSG =
  "Reward 정산 등록이 필요합니다. 마이페이지에서 계좌번호·실명·주소를 입력해 정산을 등록해 주세요.";

export const SETTLEMENT_ACCOUNT_REQUIRED_CODE = "SETTLEMENT_ACCOUNT_REQUIRED";

export type SettlementAccountUser = {
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
  creatorSettlementProfile?: { registeredAt?: Date | null; payoutsEnabled?: boolean } | null;
};

/** Stripe Connect Custom 정산 등록 완료 여부 */
export function hasSettlementAccount(user: SettlementAccountUser | null | undefined): boolean {
  if (!user) return false;
  return !!(
    user.creatorSettlementProfile?.payoutsEnabled ||
    user.creatorSettlementProfile?.registeredAt ||
    user.stripeOnboardingCompleted ||
    user.stripeConnectOnboardedAt
  );
}

export function assertSettlementAccount(user: SettlementAccountUser | null | undefined): string | null {
  if (hasSettlementAccount(user)) return null;
  return SETTLEMENT_ACCOUNT_REQUIRED_MSG;
}

/** 지갑 Reward 탭 — 앱 내 정산 등록 UI */
export function walletSettlementPath(callbackUrl?: string): string {
  const base = "/wallet?tab=earnings";
  if (!callbackUrl?.startsWith("/")) return base;
  return `${base}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export function settlementRequiredResult(callbackUrl?: string) {
  return {
    error: SETTLEMENT_ACCOUNT_REQUIRED_MSG,
    code: SETTLEMENT_ACCOUNT_REQUIRED_CODE as typeof SETTLEMENT_ACCOUNT_REQUIRED_CODE,
    redirectTo: walletSettlementPath(callbackUrl),
  };
}
