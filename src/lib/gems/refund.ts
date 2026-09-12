import { db } from "@/lib/db";

/** 구매 MOCO는 환불 불가 — 정책상 절대 환불 처리하지 않음 */
export async function processRefundRequest(gemPurchaseId: string, requestedBy: string) {
  const purchase = await db.gemPurchase.findUnique({ where: { id: gemPurchaseId } });

  if (!purchase || purchase.fanId !== requestedBy) {
    return { error: "UNAUTHORIZED" as const };
  }

  return { error: "REFUND_NOT_ALLOWED" as const };
}

export async function submitUnauthorizedPaymentClaim(input: {
  gemPurchaseId: string;
  fanId: string;
  reason: "stolen_card" | "minor_without_consent";
  proofUrl?: string;
}) {
  const purchase = await db.gemPurchase.findUnique({
    where: { id: input.gemPurchaseId },
  });
  if (!purchase || purchase.fanId !== input.fanId) {
    return { error: "UNAUTHORIZED" as const };
  }

  const claim = await db.unauthorizedPaymentClaim.create({
    data: {
      gemPurchaseId: input.gemPurchaseId,
      fanId: input.fanId,
      reason: input.reason,
      status: "submitted",
      proofUrl: input.proofUrl ?? null,
    },
  });

  return { success: true as const, claim };
}
