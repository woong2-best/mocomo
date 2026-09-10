/**
 * Re-authorize expiring Star Market auth holds (manual capture).
 * Mirrors used-auction re-auth — keeps hold alive within card network windows.
 */

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getOrCreateStripeCustomer, listSavedPaymentMethods } from "@/lib/stripe-payment-methods";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { safeLogWarn } from "@/lib/safe-log";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { buildMarketplaceConnectSplitParams } from "@/lib/marketplace/stripe-connect-split";
import {
  resolveHoldExpiresAtFromPaymentIntent,
  shouldSkipReauthorization,
} from "@/lib/marketplace/card-authorization";
import { resolveMarketplaceStripePaymentIntentId } from "@/lib/marketplace/stripe-payment";
import { marketplaceStripeMetadata } from "@/lib/marketplace/stripe-order-metadata";
import { syncMarketplaceOrderAuthHoldExpiry } from "@/lib/marketplace/auth-hold-sync";
import { manualAuthRenewReasonFromError } from "@/lib/marketplace/stripe-errors";
import { MARKETPLACE_REAUTH_LEAD_HOURS } from "@/lib/marketplace/protection-config";

async function markPaymentSettlementBlocked(orderId: string, reason: string) {
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      settlementStatus: "BLOCKED",
      settlementHeldReason: reason,
      settlementBlockedAt: new Date(),
      escrowHeld: true,
    },
  });
}

const ACTIVE_HOLD_STATUSES = ["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED"] as const;

export type MarketplaceAuthRenewResult =
  | { ok: true; auto: true; stripePaymentIntentId: string }
  | { ok: true; manual: true; reason: string }
  | { error: string };

async function findMarketplacePaymentIntentDbId(orderId: string): Promise<string | null> {
  const row = await db.paymentIntent.findFirst({
    where: {
      type: "MARKETPLACE",
      metadata: { path: ["marketplaceOrderId"], equals: orderId },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return row?.id ?? null;
}

/** Void uncaptured PI and create a fresh Connect manual-capture authorization. */
export async function renewMarketplaceAuthHold(orderId: string): Promise<MarketplaceAuthRenewResult> {
  if (!isStripeConfigured()) return { error: "Stripe not configured" };

  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { id: true, email: true } },
      seller: { select: { id: true, stripeConnectAccountId: true } },
      items: { select: { listingId: true }, take: 1 },
    },
  });
  if (!order) return { error: "주문을 찾을 수 없습니다." };
  if (order.checkoutMode !== "STRIPE") return { error: "Stripe 주문이 아닙니다." };
  if (!ACTIVE_HOLD_STATUSES.includes(order.status as (typeof ACTIVE_HOLD_STATUSES)[number])) {
    return { error: "갱신 대상 상태가 아닙니다." };
  }

  const storedRef = order.stripePaymentIntentId ?? order.stripeCheckoutSessionId;
  const piId = await resolveMarketplaceStripePaymentIntentId(storedRef);
  if (!piId) return { error: "PaymentIntent not found" };

  const stripe = getStripe();
  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "PI retrieve failed" };
  }

  if (pi.status !== "requires_capture") {
    return { error: `PI not capturable (${pi.status})` };
  }

  const paymentIntentDbId = await findMarketplacePaymentIntentDbId(orderId);
  if (!paymentIntentDbId) return { error: "결제 기록을 찾을 수 없습니다." };

  const listingId = order.items[0]?.listingId;
  if (!listingId) return { error: "상품 정보가 없습니다." };

  try {
    await stripe.paymentIntents.cancel(piId);
  } catch (e) {
    return { ok: true, manual: true, reason: e instanceof Error ? e.message : "cancel_failed" };
  }

  const customerId = await getOrCreateStripeCustomer(order.buyer.id, order.buyer.email);
  const totalAmount = order.subtotalAmount + order.shippingAmount;
  const connectSplit = await buildMarketplaceConnectSplitParams({
    checkoutMode: "STRIPE",
    sellerConnectAccountId: order.seller.stripeConnectAccountId,
    platformFeeAmount: order.platformFeeAmount,
    totalAmount,
    transferGroup: order.id,
    checkoutBrandUnknown: true,
  });

  const newPi = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: order.currency,
    customer: customerId,
    description: `MoCoMo market order ${order.id.slice(0, 8)} (auth renewal)`,
    metadata: marketplaceStripeMetadata({
      paymentIntentDbId,
      buyerId: order.buyerId,
      marketplaceOrderId: order.id,
      listingId,
      sellerId: order.sellerId,
    }),
    automatic_payment_methods: { enabled: true },
    ...connectSplit,
  });

  const methods = await listSavedPaymentMethods(order.buyer.id);
  const pm = methods.find((m) => m.isDefault) ?? methods[0];
  if (!pm) {
    return { ok: true, manual: true, reason: "no_saved_card" };
  }

  try {
    const confirmed = await stripe.paymentIntents.confirm(newPi.id, {
      payment_method: pm.id,
      off_session: true,
    });
    if (confirmed.status !== "requires_capture") {
      return { ok: true, manual: true, reason: `unexpected_status_${confirmed.status}` };
    }
  } catch (e) {
    return { ok: true, manual: true, reason: manualAuthRenewReasonFromError(e) };
  }

  await db.paymentIntent.update({
    where: { id: paymentIntentDbId },
    data: { paymentKey: newPi.id },
  });

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      stripePaymentIntentId: newPi.id,
      settlementHeldReason: null,
      settlementBlockedAt: null,
    },
  });

  await syncMarketplaceOrderAuthHoldExpiry(orderId);

  await logMarketplaceAudit({
    orderId,
    actorId: null,
    action: MarketplaceAuditActions.PAYMENT,
    detail: "auth_hold_renewed",
    metadata: { oldPi: piId, newPi: newPi.id },
  });

  return { ok: true, auto: true, stripePaymentIntentId: newPi.id };
}

export async function reauthorizeExpiringMarketplaceHoldsBatch(limit = 30) {
  if (!isStripeConfigured()) {
    return { checked: 0, renewed: 0, manual: 0, failed: 0, skipped: 0 };
  }

  const stripe = getStripe();
  const leadMs = MARKETPLACE_REAUTH_LEAD_HOURS * 60 * 60 * 1000;
  const now = Date.now();

  const cutoff = new Date(now + leadMs);

  const candidates = await db.marketplaceOrder.findMany({
    where: {
      status: { in: [...ACTIVE_HOLD_STATUSES] },
      checkoutMode: "STRIPE",
      escrowHeld: true,
      settlementStatus: { notIn: ["SETTLED", "REVERSED"] },
      OR: [
        { stripePaymentIntentId: { not: null } },
        { stripeCheckoutSessionId: { not: null } },
      ],
      AND: [
        {
          OR: [
            { authHoldExpiresAt: { lte: cutoff } },
            { authHoldExpiresAt: null },
          ],
        },
      ],
    },
    take: limit,
    orderBy: [{ authHoldExpiresAt: "asc" }, { updatedAt: "asc" }],
    select: {
      id: true,
      buyerId: true,
      authHoldExpiresAt: true,
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
    },
  });

  let renewed = 0;
  let manual = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of candidates) {
    try {
      const piId = await resolveMarketplaceStripePaymentIntentId(
        row.stripePaymentIntentId ?? row.stripeCheckoutSessionId
      );
      if (!piId) {
        skipped += 1;
        continue;
      }

      const pi = await stripe.paymentIntents.retrieve(piId);
      if (pi.status !== "requires_capture") {
        skipped += 1;
        continue;
      }

      let holdExpiresAt = row.authHoldExpiresAt;
      if (!holdExpiresAt || holdExpiresAt.getTime() - now > leadMs) {
        holdExpiresAt = await resolveHoldExpiresAtFromPaymentIntent(stripe, pi);
        await db.marketplaceOrder.update({
          where: { id: row.id },
          data: { authHoldExpiresAt: holdExpiresAt },
        });
      }

      if (shouldSkipReauthorization(holdExpiresAt, now)) {
        skipped += 1;
        continue;
      }

      const remainingMs = holdExpiresAt.getTime() - now;
      if (remainingMs > leadMs) {
        skipped += 1;
        continue;
      }

      const result = await renewMarketplaceAuthHold(row.id);
      if ("error" in result) {
        failed += 1;
        continue;
      }
      if ("auto" in result && result.auto) {
        renewed += 1;
        await createNotification({
          userId: row.buyerId,
          type: "SYSTEM",
          title: "결제 승인이 갱신되었습니다",
          body: "배송·구매확정 대기 중 카드 승인을 자동으로 갱신했습니다.",
          link: `/market/orders/${row.id}`,
        });
        continue;
      }
      if ("manual" in result && result.manual) {
        manual += 1;
        const hint =
          result.reason === "requires_3ds"
            ? "카드사 본인인증(3DS)이 필요합니다. 주문 페이지에서 카드를 다시 확인해 주세요."
            : "주문 페이지에서 카드를 다시 확인해 주세요. 갱신하지 않으면 정산이 지연될 수 있습니다.";
        await markPaymentSettlementBlocked(
          row.id,
          `카드 승인 갱신 필요 (${result.reason})`
        );
        await createNotification({
          userId: row.buyerId,
          type: "SYSTEM",
          title: "결제 승인 갱신이 필요합니다",
          body: hint,
          link: `/market/orders/${row.id}`,
        });
      }
    } catch (e) {
      failed += 1;
      safeLogWarn("marketplace-hold-reauth", { orderId: row.id, err: String(e) });
    }
  }

  return { checked: candidates.length, renewed, manual, failed, skipped };
}
