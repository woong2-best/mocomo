/** Stripe off-session / re-auth error classification. */

export function isStripeAuthenticationRequiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; decline_code?: string; message?: string };
  if (err.code === "authentication_required") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("authentication_required") || msg.includes("requires authentication");
}

export function manualAuthRenewReasonFromError(error: unknown): string {
  if (isStripeAuthenticationRequiredError(error)) return "requires_3ds";
  if (error instanceof Error) return error.message.slice(0, 120);
  return "confirm_failed";
}

/** Settlement BLOCKED for payment recovery (not dispute/admin). */
export function isPaymentSettlementBlockReason(reason: string | null | undefined): boolean {
  if (!reason?.trim()) return false;
  return /캡처|승인 갱신|카드|capture|re-?auth|결제|3ds|requires_3ds/i.test(reason);
}
