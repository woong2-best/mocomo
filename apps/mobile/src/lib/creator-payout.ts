import { ApiError, apiRequest } from "@/api/client";

export const CREATOR_PAYOUT_BLOCKED_KO =
  "해당 크리에이터가 아직 정산 계좌(Stripe)를 연동하지 않아 후원할 수 없습니다.";

export const CREATOR_PAYOUT_BLOCKED_TOAST_KO =
  "해당 크리에이터가 정산 계좌를 연동하지 않아 후원할 수 없습니다.";

export function fetchCreatorPayoutReady(target: string) {
  return apiRequest<{ payoutsEnabled: boolean }>(
    `/api/creators/payout-ready?target=${encodeURIComponent(target)}`
  );
}

export function isStripeAccountNotReady(err: unknown): boolean {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== "object") return false;
  return (err.body as { code?: string }).code === "STRIPE_ACCOUNT_NOT_READY";
}
