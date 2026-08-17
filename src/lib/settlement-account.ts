import { isBankVerified } from "@/lib/bank-verification";

export const SETTLEMENT_ACCOUNT_REQUIRED_MSG =
  "수익 입금 계좌 등록이 필요합니다. 지갑 → 수익 탭에서 본인 명의 계좌를 1원 인증으로 등록해 주세요.";

export const SETTLEMENT_ACCOUNT_REQUIRED_CODE = "SETTLEMENT_ACCOUNT_REQUIRED";

export type SettlementAccountUser = {
  bankVerifiedAt?: Date | null;
  phoneVerified?: Date | null;
};

/** Apick 1원 인증 완료 여부 (수익 입금 계좌) */
export function hasSettlementAccount(user: SettlementAccountUser | null | undefined): boolean {
  if (!user) return false;
  return isBankVerified(user);
}

export function assertSettlementAccount(user: SettlementAccountUser | null | undefined): string | null {
  if (hasSettlementAccount(user)) return null;
  return SETTLEMENT_ACCOUNT_REQUIRED_MSG;
}

/** 지갑 수익 탭 — 계좌 등록 UI */
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
