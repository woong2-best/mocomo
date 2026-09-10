/**
 * Capture failure recovery for Star Market orders (non-auction).
 */

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { renewMarketplaceAuthHold } from "@/lib/marketplace/auth-hold-renewal";
import { MARKETPLACE_SETTLEMENT_BLOCKED_GRACE_DAYS } from "@/lib/marketplace/protection-config";
import { isPaymentSettlementBlockReason } from "@/lib/marketplace/stripe-errors";
import { refundOrReleaseMarketplacePayment } from "@/lib/marketplace/stripe-payment";
import { handleUsedAuctionOrderCaptureFailure } from "@/lib/used-auction-marketplace-order";

export async function handleMarketplaceCaptureFailure(
  orderId: string,
  reason: string,
  opts?: { actorId?: string | null; attemptRenew?: boolean }
): Promise<{ handled: true; renewed?: boolean } | { handled: false }> {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      usedListingId: true,
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
      status: true,
    },
  });
  if (!order) return { handled: false };

  if (order.usedListingId) {
    await handleUsedAuctionOrderCaptureFailure(orderId, reason);
    return { handled: true };
  }

  await logMarketplaceAudit({
    orderId,
    actorId: opts?.actorId ?? null,
    action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
    detail: `capture_failed:${reason}`,
  });

  if (opts?.attemptRenew !== false) {
    const renew = await renewMarketplaceAuthHold(orderId);
    if ("auto" in renew && renew.auto) {
      return { handled: true, renewed: true };
    }
  }

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      settlementStatus: "BLOCKED",
      settlementHeldReason: `정산 캡처 실패 — 카드 승인 갱신 또는 재결제 필요 (${reason})`,
      settlementBlockedAt: new Date(),
      escrowHeld: true,
    },
  });

  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title: "주문 결제 승인 확인 필요",
    body: "구매 확정 후 정산 처리에 실패했습니다. 주문 페이지에서 결제 수단을 확인해 주세요.",
    link: `/market/orders/${orderId}`,
  });
  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "정산 지연 — 구매자 결제 확인 필요",
    body: "구매자 카드 승인 갱신이 필요해 정산이 일시 보류되었습니다.",
    link: `/market/orders/${orderId}`,
  });

  return { handled: true };
}

/** Close payment-recovery BLOCKED orders after grace period — void auth, notify parties. */
export async function processStalePaymentBlockedOrdersBatch(limit = 20): Promise<{
  checked: number;
  closed: number;
}> {
  const cutoff = new Date(
    Date.now() - MARKETPLACE_SETTLEMENT_BLOCKED_GRACE_DAYS * 24 * 60 * 60 * 1000
  );

  const candidates = await db.marketplaceOrder.findMany({
    where: {
      settlementStatus: "BLOCKED",
      settlementBlockedAt: { lte: cutoff, not: null },
      checkoutMode: "STRIPE",
      status: { notIn: ["REFUNDED", "CANCELLED", "SETTLED"] },
    },
    take: limit,
    orderBy: { settlementBlockedAt: "asc" },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      subtotalAmount: true,
      shippingAmount: true,
      settlementHeldReason: true,
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
      usedListingId: true,
    },
  });

  let closed = 0;
  for (const order of candidates) {
    if (!isPaymentSettlementBlockReason(order.settlementHeldReason)) continue;

    const storedRef = order.stripePaymentIntentId ?? order.stripeCheckoutSessionId;
    const amount = order.subtotalAmount + order.shippingAmount;
    if (storedRef) {
      await refundOrReleaseMarketplacePayment({ storedRef, amount }).catch(() => null);
    }

    await db.marketplaceOrder.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        settlementStatus: "REVERSED",
        escrowHeld: false,
        authHoldExpiresAt: null,
        settlementHeldReason: `결제 정산 실패 — ${MARKETPLACE_SETTLEMENT_BLOCKED_GRACE_DAYS}일 내 카드 갱신 없음`,
      },
    });

    await logMarketplaceAudit({
      orderId: order.id,
      action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
      detail: "payment_blocked_grace_expired",
    });

    await createNotification({
      userId: order.buyerId,
      type: "SYSTEM",
      title: "주문이 취소되었습니다",
      body: "기한 내 결제 승인을 갱신하지 않아 주문이 취소되었습니다. 카드 청구는 되지 않았을 수 있습니다.",
      link: `/market/orders/${order.id}`,
    });
    await createNotification({
      userId: order.sellerId,
      type: "SYSTEM",
      title: "주문 취소 — 결제 정산 실패",
      body: "구매자 카드 승인 갱신이 없어 주문이 취소되었습니다. 배송·분쟁이 있었다면 고객센터로 문의해 주세요.",
      link: `/market/orders/${order.id}`,
    });

    closed += 1;
  }

  return { checked: candidates.length, closed };
}
