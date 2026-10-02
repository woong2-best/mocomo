"use server";

import { requireAuth } from "@/lib/auth";
import { getCreatorSettlementStatusForUser } from "@/lib/settlement-register-service";

/** @deprecated Custom Connect 제거 — POST /api/settlements/connect-account 사용 */
export async function registerCreatorSettlement(_raw: unknown) {
  void _raw;
  return {
    error: "actions.custom_connect_stripe_express",
    code: "CUSTOM_CONNECT_DEPRECATED" as const,
  };
}

export async function getCreatorSettlementStatus() {
  const user = await requireAuth();
  return getCreatorSettlementStatusForUser(user.id);
}
