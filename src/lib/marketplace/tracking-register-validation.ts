/**
 * Validate tracking number at seller registration — block reuse and pre-delivered waybills.
 */

import { db } from "@/lib/db";
import { is17TrackDelivered } from "@/lib/marketplace/delivery-pipeline";
import type { TrackingProvider } from "@/lib/marketplace/tracking";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";

const ACTIVE_ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CONFIRMED",
  "ADMIN_REVIEW",
  "DISPUTED",
  "REFUND_REQUESTED",
] as const;

export async function assertTrackingNumberNotReused(
  trackingNumber: string,
  orderId: string
): Promise<{ ok: true } | { error: string }> {
  const normalized = trackingNumber.trim();
  if (!normalized) return { ok: true };

  const duplicate = await db.marketplaceShipment.findFirst({
    where: {
      trackingNumber: normalized,
      orderId: { not: orderId },
      order: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
    },
    select: { orderId: true },
  });

  if (duplicate) {
    return {
      error:
        "이 송장번호는 다른 진행 중인 주문에 이미 등록되어 있습니다. 본인 발송 송장인지 확인해 주세요.",
    };
  }

  return { ok: true };
}

async function flagOrderForTrackingReview(orderId: string, detail: string) {
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      status: "ADMIN_REVIEW",
      adminReviewRequired: true,
      settlementStatus: "BLOCKED",
      settlementHeldReason: detail,
    },
  });
  await logMarketplaceAudit({
    orderId,
    actorId: null,
    action: MarketplaceAuditActions.ADMIN_ACTION,
    detail: `tracking_review:${detail}`,
  });
}

/** Post-register fetch — reject already-delivered waybills (stolen tracking fraud). */
export async function validateTrackingAfterRegister(input: {
  orderId: string;
  trackingNumber: string;
  carrierCode: string;
  externalTrackingId?: string | null;
  provider: TrackingProvider;
}): Promise<{ ok: true } | { error: string }> {
  const reuse = await assertTrackingNumberNotReused(input.trackingNumber, input.orderId);
  if ("error" in reuse) return reuse;

  const snapshot = await input.provider.fetchTracking({
    carrierId: input.carrierCode,
    trackingNumber: input.trackingNumber,
    externalId: input.externalTrackingId,
  });

  if (!snapshot?.status) return { ok: true };

  if (is17TrackDelivered(snapshot.status)) {
    await flagOrderForTrackingReview(
      input.orderId,
      "already_delivered_tracking_at_registration"
    );
    return {
      error:
        "등록한 송장이 이미 배송완료 상태입니다. 다른 주문의 송장번호가 아닌지 확인해 주세요. 주문이 관리자 검토로 전환되었습니다.",
    };
  }

  return { ok: true };
}
