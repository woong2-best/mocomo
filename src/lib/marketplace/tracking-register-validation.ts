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
        "This tracking number is already registered on another open order. Confirm it is your shipment's tracking number.",
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
        "The tracking you registered is already marked delivered. Confirm it is not another order's tracking number. The order was sent for admin review.",
    };
  }

  return { ok: true };
}
