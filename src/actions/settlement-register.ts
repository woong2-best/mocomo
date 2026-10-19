"use server";

import { requireAuth } from "@/lib/auth";
import { getCreatorSettlementStatusForUser } from "@/lib/settlement-register-service";

/** Creator payout registration no longer creates a Stripe Connect account. */
export async function registerCreatorSettlement(_raw: unknown) {
  void _raw;
  return {
    error:
      "Creator payouts are sent manually. Upload a W-9 or W-8BEN and a Payoneer, Wise, or bank destination in your wallet.",
    code: "CONNECT_PAYOUT_RETIRED" as const,
  };
}

export async function getCreatorSettlementStatus() {
  const user = await requireAuth();
  return getCreatorSettlementStatusForUser(user.id);
}
