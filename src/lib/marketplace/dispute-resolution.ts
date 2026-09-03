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
  if (!dispute) return { error: "분쟁을 찾을 수 없습니다." };
  if (["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"].includes(dispute.status)) {
    return { error: "이미 처리된 분쟁입니다." };
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
        reason: resolutionNote || "분쟁 해결 환불",
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
          : "분쟁 환불",
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
    title: input.autoRule ? "분쟁 자동 처리 결과" : "분쟁 처리 결과",
    body: resolutionNote || status,
    link: `/market/orders/${dispute.orderId}`,
  });
  await createNotification({
    userId: dispute.order.sellerId,
    type: "SYSTEM",
    title: input.autoRule ? "분쟁 자동 처리 결과" : "분쟁 처리 결과",
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
  if (!order) return { error: "주문을 찾을 수 없습니다." };
  if (order.disputes.length > 0) return { error: "분쟁 존재", skipped: true };
  if (!["PAID", "PREPARING"].includes(order.status)) {
    return { error: "대상 상태 아님", skipped: true };
  }
  if (order.checkoutMode !== "STRIPE") return { error: "Stripe 주문 아님", skipped: true };
  const tracking = order.shipment?.trackingNumber?.trim();
  if (tracking) return { error: "운송장 등록됨", skipped: true };

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
      reason: "auto:NO_SHIP_DEADLINE — 운송장 미등록 자동 환불",
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
      settlementHeldReason: "운송장 미등록 자동 환불",
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
    title: "자동 환불 — 운송장 미등록",
    body: "판매자가 기한 내 운송장을 등록하지 않아 결제가 자동 환불되었습니다.",
    link: `/market/orders/${orderId}`,
  });
  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "자동 환불 — 운송장 미등록",
    body: "운송장 등록 기한을 초과하여 주문이 자동 환불 처리되었습니다.",
    link: `/market/orders/${orderId}`,
  });

  return { success: true };
}
