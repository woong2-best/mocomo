/**
 * Shared marketplace dispute resolution — admin + auto-rules.
 */

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import {
  releaseMarketplaceEscrow,
} from "@/lib/marketplace/escrow";
import { refreshSellerTrust } from "@/lib/marketplace/trust";
import { syncSellerStripeReserve } from "@/lib/marketplace/stripe-connect-reserve";
import { refundOrReleaseMarketplacePayment } from "@/lib/marketplace/stripe-payment";

export type DisputeDecision = "buyer" | "seller" | "partial";

export async function executeMarketplaceDisputeResolution(input: {
  disputeId: string;
  decision: DisputeDecision;
  note: string;
  partialAmount?: number;
  actorId?: string | null;
  autoRule?: string | null;
}): Promise<{ success: true } | { error: string }> {
  const dispute = await db.marketplaceDispute.findUnique({
    where: { id: input.disputeId },
    include: { order: true },
  });
  if (!dispute) return { error: "Dispute not found." };
  if (["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"].includes(dispute.status)) {
    return { error: "This dispute was already processed." };
  }

  const resolutionNote =
    input.autoRule != null
      ? `[auto:${input.autoRule}] ${input.note.trim()}`.slice(0, 2000)
      : input.note.trim();

  const status =
    input.decision === "buyer"
      ? "RESOLVED_BUYER"
      : input.decision === "seller"
        ? "RESOLVED_SELLER"
        : "CLOSED";

  await db.marketplaceDispute.update({
    where: { id: input.disputeId },
    data: {
      status,
      resolution: resolutionNote || status,
      resolvedAt: new Date(),
    },
  });

  if (input.decision === "buyer" || input.decision === "partial") {
    const amount =
      input.decision === "partial" && input.partialAmount && input.partialAmount > 0
        ? Math.min(
            input.partialAmount,
            dispute.order.subtotalAmount + dispute.order.shippingAmount
          )
        : dispute.order.subtotalAmount + dispute.order.shippingAmount;

    let stripeRefundId: string | undefined;
    const storedRef =
      dispute.order.stripePaymentIntentId ?? dispute.order.stripeCheckoutSessionId;
    if (storedRef) {
      const stripeRes = await refundOrReleaseMarketplacePayment({
        storedRef,
        amount,
      });
      if ("ok" in stripeRes) {
        stripeRefundId =
          stripeRes.stripeRefId ?? (stripeRes.mode === "cancelled" ? "cancelled" : undefined);
      }
    }

    await db.marketplaceRefund.create({
      data: {
        orderId: dispute.orderId,
        requesterId: dispute.openerId,
        reason: resolutionNote || "Dispute resolution refund",
        amount,
        status: stripeRefundId ? "COMPLETED" : "APPROVED",
        stripeRefundId,
        decidedAt: new Date(),
      },
    });

    await db.marketplaceOrder.update({
      where: { id: dispute.orderId },
      data: {
        status: "REFUNDED",
        settlementStatus: "REVERSED",
        escrowHeld: false,
        settlementHeldReason: input.autoRule
          ? `자동 분쟁 규칙: ${input.autoRule}`
          : "Dispute refund",
      },
    });
    await db.marketplaceSellerProfile.updateMany({
      where: { userId: dispute.order.sellerId },
      data: { refundedOrderCount: { increment: 1 } },
    });
  } else {
    await db.marketplaceOrder.update({
      where: { id: dispute.orderId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        settlementStatus: "READY",
        adminReviewRequired: false,
        settlementHeldReason: null,
      },
    });
    await releaseMarketplaceEscrow(dispute.orderId, {
      actorId: input.actorId ?? null,
      force: true,
    });
  }

  await logMarketplaceAudit({
    orderId: dispute.orderId,
    actorId: input.actorId ?? null,
    action: input.autoRule
      ? MarketplaceAuditActions.AUTO_DISPUTE
      : MarketplaceAuditActions.DISPUTE_RESOLVE,
    detail: `${input.decision}:${resolutionNote.slice(0, 200)}`,
    metadata: input.autoRule ? { autoRule: input.autoRule } : undefined,
  });

  await refreshSellerTrust(dispute.order.sellerId).catch(() => null);
  await syncSellerStripeReserve(dispute.order.sellerId).catch(() => null);

  await createNotification({
    userId: dispute.order.buyerId,
    type: "SYSTEM",
    title: input.autoRule ? "분쟁 자동 처리 결과" : "Dispute outcome",
    body: resolutionNote || status,
    link: `/market/orders/${dispute.orderId}`,
  });
  await createNotification({
    userId: dispute.order.sellerId,
    type: "SYSTEM",
    title: input.autoRule ? "분쟁 자동 처리 결과" : "Dispute outcome",
    body: resolutionNote || status,
    link: `/market/orders/${dispute.orderId}`,
  });

  return { success: true };
}

/** System-initiated refund when seller misses ship deadline (no tracking). */
export async function executeNoShipAutoRefund(orderId: string): Promise<
  { success: true } | { error: string; skipped?: boolean }
> {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { shipment: true, disputes: { take: 1 } },
  });
  if (!order) return { error: "Order not found." };
  if (order.disputes.length > 0) return { error: "Dispute exists", skipped: true };
  if (!["PAID", "PREPARING"].includes(order.status)) {
    return { error: "Wrong status", skipped: true };
  }
  if (order.checkoutMode !== "STRIPE") return { error: "Not a Stripe order", skipped: true };
  const tracking = order.shipment?.trackingNumber?.trim();
  if (tracking) return { error: "Tracking number registered", skipped: true };

  const amount = order.subtotalAmount + order.shippingAmount;
  let stripeRefundId: string | undefined;
  const storedRef = order.stripePaymentIntentId ?? order.stripeCheckoutSessionId;
  if (storedRef) {
    const stripeRes = await refundOrReleaseMarketplacePayment({ storedRef, amount });
    if ("ok" in stripeRes) {
      stripeRefundId =
        stripeRes.stripeRefId ?? (stripeRes.mode === "cancelled" ? "cancelled" : undefined);
    }
  }

  await db.marketplaceRefund.create({
    data: {
      orderId,
      requesterId: order.buyerId,
      reason: "auto:NO_SHIP_DEADLINE — automatic refund for missing tracking",
      amount,
      status: stripeRefundId ? "COMPLETED" : "APPROVED",
      stripeRefundId,
      decidedAt: new Date(),
    },
  });

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      status: "REFUNDED",
      settlementStatus: "REVERSED",
      escrowHeld: false,
      settlementHeldReason: "Automatic refund for missing tracking",
      cancelledAt: new Date(),
    },
  });

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: order.sellerId },
    data: {
      refundedOrderCount: { increment: 1 },
      lateShipCount: { increment: 1 },
    },
  });

  await logMarketplaceAudit({
    orderId,
    action: MarketplaceAuditActions.AUTO_DISPUTE,
    detail: "auto:NO_SHIP_DEADLINE",
    metadata: { rule: "NO_SHIP_DEADLINE" },
  });

  await refreshSellerTrust(order.sellerId).catch(() => null);
  await syncSellerStripeReserve(order.sellerId).catch(() => null);

  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title: "Automatic refund — no tracking number",
    body: "Payment was automatically refunded because the seller did not register tracking in time.",
    link: `/market/orders/${orderId}`,
  });
  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "Automatic refund — no tracking number",
    body: "The order was automatically refunded because the tracking registration deadline passed.",
    link: `/market/orders/${orderId}`,
  });

  return { success: true };
}
