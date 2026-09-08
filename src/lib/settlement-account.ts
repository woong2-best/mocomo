export const SETTLEMENT_ACCOUNT_REQUIRED_MSG =
  "수익 정산 계좌 연동이 필요합니다. 지갑 → 수익 탭에서 Stripe Connect로 정산 계좌를 등록해 주세요.";

export const SETTLEMENT_ACCOUNT_REQUIRED_CODE = "SETTLEMENT_ACCOUNT_REQUIRED";

export type SettlementAccountUser = {
  stripeOnboardingCompleted?: boolean;
  stripeConnectOnboardedAt?: Date | null;
};

/** Stripe Connect Express 온보딩 완료 여부 */
export function hasSettlementAccount(user: SettlementAccountUser | null | undefined): boolean {
  if (!user) return false;
  return !!(user.stripeOnboardingCompleted || user.stripeConnectOnboardedAt);
}

export function assertSettlementAccount(user: SettlementAccountUser | null | undefined): string | null {
  if (hasSettlementAccount(user)) return null;
  return SETTLEMENT_ACCOUNT_REQUIRED_MSG;
}

/** 지갑 수익 탭 — Stripe Connect 연동 UI */
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
