import { ApiError, apiRequest } from "@/api/client";

export const CREATOR_PAYOUT_BLOCKED = "m.lib.creator_payout_blocked";

export const CREATOR_PAYOUT_BLOCKED_TOAST = "m.lib.creator_payout_blocked_toast";

export function fetchCreatorPayoutReady(target: string) {
  return apiRequest<{ payoutsEnabled: boolean }>(
    `/api/creators/payout-ready?target=${encodeURIComponent(target)}`
  );
}

export function isStripeAccountNotReady(err: unknown): boolean {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== "object") return false;
  return (err.body as { code?: string }).code === "STRIPE_ACCOUNT_NOT_READY";
}
