/**
 * Stripe chargeback / dispute sync for Star Market orders.
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { holdSettlementForDispute } from "@/lib/marketplace/escrow";
import {
  findMarketplaceOrderByStripePaymentIntent,
  resolveMarketplaceStripePaymentIntentId,
} from "@/lib/marketplace/stripe-payment";
import { refreshSellerTrust } from "@/lib/marketplace/trust";
import { syncSellerStripeReserve } from "@/lib/marketplace/stripe-connect-reserve";
import { safeLogInfo } from "@/lib/safe-log";

function disputePaymentIntentId(dispute: Stripe.Dispute): string | null {
  const pi = dispute.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

export async function handleStripeChargeDisputeEvent(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const piId = disputePaymentIntentId(dispute);
  if (!piId) return;

  const order = await findMarketplaceOrderByStripePaymentIntent(piId);
  if (!order) {
    safeLogInfo("stripe-dispute", { piId, event: event.type, note: "no marketplace order" });
    return;
  }

  if (event.type === "charge.dispute.created") {
    await holdSettlementForDispute(order.id);
    await db.marketplaceOrder.update({
      where: { id: order.id },
      data: { status: "DISPUTED" },
    });
    await logMarketplaceAudit({
      orderId: order.id,
      action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
      detail: `stripe_dispute:${dispute.id}`,
      metadata: { reason: dispute.reason, amount: dispute.amount },
    });
    await createNotification({
      userId: order.sellerId,
      type: "SYSTEM",
      title: "Stripe 차지백(분쟁) 접수",
      body: "정산이 보류되었습니다. Stripe Dashboard에서 증빙을 제출해 주세요.",
      link: `/market/orders/${order.id}`,
    });
    await createNotification({
      userId: order.buyerId,
      type: "SYSTEM",
      title: "결제 분쟁 접수",
      body: "카드사 분쟁 절차가 진행 중입니다.",
      link: `/market/orders/${order.id}`,
    });
    await refreshSellerTrust(order.sellerId).catch(() => null);
    await syncSellerStripeReserve(order.sellerId).catch(() => null);
    return;
  }

  if (event.type === "charge.dispute.closed") {
    const won = dispute.status === "won";
    const lost = dispute.status === "lost";

    await logMarketplaceAudit({
      orderId: order.id,
      action: MarketplaceAuditActions.DISPUTE_RESOLVE,
      detail: `stripe_dispute_closed:${dispute.status}`,
      metadata: { disputeId: dispute.id },
    });

    if (lost) {
      await db.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          status: "REFUNDED",
          settlementStatus: "REVERSED",
          escrowHeld: false,
          settlementHeldReason: "Stripe chargeback lost",
        },
      });
      await db.marketplaceSellerProfile.updateMany({
        where: { userId: order.sellerId },
        data: { refundedOrderCount: { increment: 1 } },
      });
      await createNotification({
        userId: order.sellerId,
        type: "SYSTEM",
        title: "차지백 패소",
        body: "카드사 분쟁에서 패소했습니다. 정산이 회수됩니다.",
        link: `/market/orders/${order.id}`,
      });
    } else if (won) {
      const current = await db.marketplaceOrder.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      await db.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          settlementHeldReason: null,
          ...(current?.status === "DISPUTED" ? { status: "DELIVERED" as const } : {}),
        },
      });
      await createNotification({
        userId: order.sellerId,
        type: "SYSTEM",
        title: "차지백 승소",
        body: "카드사 분쟁에서 승소했습니다.",
        link: `/market/orders/${order.id}`,
      });
    }

    await refreshSellerTrust(order.sellerId).catch(() => null);
    await syncSellerStripeReserve(order.sellerId).catch(() => null);
    return;
  }

  if (event.type === "charge.dispute.funds_withdrawn") {
    await db.marketplaceOrder.update({
      where: { id: order.id },
      data: {
        settlementStatus: "REVERSED",
        escrowHeld: false,
        settlementHeldReason: "Stripe dispute funds withdrawn",
      },
    });
    await logMarketplaceAudit({
      orderId: order.id,
      action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
      detail: `stripe_dispute_funds_withdrawn:${dispute.id}`,
    });
    await refreshSellerTrust(order.sellerId).catch(() => null);
    await syncSellerStripeReserve(order.sellerId).catch(() => null);
  }
}

/** Resolve PI from dispute for admin tooling. */
export async function resolveDisputePaymentIntentId(
  storedRef: string | null | undefined
): Promise<string | null> {
  return resolveMarketplaceStripePaymentIntentId(storedRef);
}
