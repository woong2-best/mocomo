import { safeLogWarn } from "@/lib/safe-log";
import { db } from "@/lib/db";
import { isStripeConnectPayoutReady } from "@/lib/stripe-connect";
import { recordMarketplaceSettlementLedger, recordPlatformFee, recordPaymentGross } from "@/lib/settlement";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { finalizeUsedListingSold } from "@/lib/subculture-commerce/sale-records";
import { refreshSellerTrust } from "@/lib/marketplace/trust";
import { handleMarketplaceCaptureFailure } from "@/lib/marketplace/capture-failure";
import { createNotification } from "@/lib/notifications";
import { formatUsd } from "@/lib/money";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import {
  captureMarketplacePaymentIntent,
  resolveMarketplaceStripePaymentIntentId,
} from "@/lib/marketplace/stripe-payment";

/**
 * Escrow: auth hold until purchase confirm, then PI capture.
 * Connect destination transfer + application fee occur at capture — not before.
 * Dispute exposure after capture sits in seller Connect account reserve.
 */
export async function releaseMarketplaceEscrow(
  orderId: string,
  opts?: { actorId?: string | null; force?: boolean; _captureRetried?: boolean }
): Promise<{ ok: true } | { error: string; deferred?: boolean }> {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      seller: {
        select: {
          id: true,
          stripeConnectAccountId: true,
          stripeConnectOnboardedAt: true,
        },
      },
      sellerProfile: true,
      disputes: {
        where: { status: { in: ["OPEN", "EVIDENCE", "REVIEWING"] } },
        take: 1,
      },
    },
  });

  if (!order) return { error: "Order not found." };
  if (order.settlementStatus === "SETTLED") return { ok: true };
  if (order.status === "REFUNDED" || order.status === "CANCELLED") {
    return { error: "Refunded or canceled orders cannot be settled." };
  }
  if (order.disputes.length > 0 && !opts?.force) {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "BLOCKED",
        settlementHeldReason: "Settlement on hold due to open dispute",
      },
    });
    await logMarketplaceAudit({
      orderId,
      actorId: opts?.actorId,
      action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
      detail: "open_dispute",
    });
    return { error: "Settlement is on hold while a dispute is open.", deferred: true };
  }

  if (
    order.status !== "CONFIRMED" &&
    order.status !== "SETTLED" &&
    !opts?.force
  ) {
    return { error: "Settlement is available only after purchase confirmation." };
  }

  const profile = order.sellerProfile;
  if (profile?.settlementBlocked || profile?.sanctionLevel === "SETTLEMENT_HELD") {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "BLOCKED",
        settlementHeldReason: "Seller settlement hold sanction",
      },
    });
    return { error: "Seller settlement is on hold due to a sanction.", deferred: true };
  }
  if (profile?.sanctionLevel === "PERMANENT_BAN") {
    return { error: "This account is permanently banned from selling." };
  }

  if (order.adminReviewRequired && !opts?.force) {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "BLOCKED",
        settlementHeldReason: "Admin review required",
      },
    });
    return { error: "This order requires admin review.", deferred: true };
  }

  const connectReady = await isStripeConnectPayoutReady(order.seller.stripeConnectAccountId);

  if (!connectReady || !order.seller.stripeConnectAccountId) {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "HELD",
        settlementHeldReason: "Stripe Connect payout setup incomplete — finish Connect onboarding in Seller Center.",
      },
    });
    return {
      error: "Settlement is on hold because Stripe Connect payouts are not active.",
      deferred: true,
    };
  }

  const storedRef = order.stripePaymentIntentId ?? order.stripeCheckoutSessionId;
  const captureRes = await captureMarketplacePaymentIntent(storedRef);
  if ("error" in captureRes) {
    if (!opts?._captureRetried) {
      const failure = await handleMarketplaceCaptureFailure(orderId, captureRes.error, {
        actorId: opts?.actorId,
      });
      if (failure.handled && failure.renewed) {
        return releaseMarketplaceEscrow(orderId, {
          actorId: opts?.actorId,
          force: opts?.force,
          _captureRetried: true,
        });
      }
    }
    return { error: `정산 캡처 실패: ${captureRes.error}` };
  }

  const settlementRef = captureRes.chargeId ?? (await resolveMarketplaceStripePaymentIntentId(storedRef));

  if (!captureRes.alreadyCaptured) {
    const gross = order.subtotalAmount + order.shippingAmount;
    await recordPaymentGross(gross, order.id, "MARKETPLACE");
    await recordPlatformFee(order.platformFeeAmount, {
      referenceType: "marketplace",
      referenceId: order.id,
      paymentIntentId: order.stripePaymentIntentId ?? undefined,
      memo: `${MARKET_BRAND_NAME} 수수료 #${order.id.slice(0, 8)}`,
    });
  }

  await recordMarketplaceSettlementLedger({
    userId: order.sellerId,
    grossAmount: order.subtotalAmount,
    platformFee: order.platformFeeAmount,
    netPaidAmount: order.sellerEarnAmount,
    stripeTransferId: settlementRef ?? "capture",
    referenceId: order.id,
    paymentIntentId: order.stripePaymentIntentId ?? undefined,
    memo: `MARKET Stripe capture #${order.id.slice(0, 8)}`,
  });

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      status: "SETTLED",
      settlementStatus: "SETTLED",
      escrowHeld: false,
      settledAt: new Date(),
      stripeTransferId: settlementRef ?? null,
      settlementHeldReason: null,
      settlementBlockedAt: null,
      authHoldExpiresAt: null,
    },
  });

  if (order.usedListingId) {
    await db.usedListing.update({
      where: { id: order.usedListingId },
      data: { status: "SOLD", auctionState: "ENDED" },
    });
    void finalizeUsedListingSold(order.usedListingId).catch(() => undefined);
  }

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: order.sellerId },
    data: { confirmedOrderCount: { increment: 1 } },
  });

  await refreshSellerTrust(order.sellerId).catch(() => null);

  await logMarketplaceAudit({
    orderId,
    actorId: opts?.actorId,
    action: MarketplaceAuditActions.SETTLEMENT,
    detail: captureRes.alreadyCaptured ? "capture_already_done" : "capture",
    metadata: { amount: order.sellerEarnAmount, chargeId: settlementRef },
  });

  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "Settlement completed",
    body: `${formatUsd(order.sellerEarnAmount)}이 정산되었습니다.`,
    link: `/market/orders/${order.id}`,
  });

  return { ok: true };
}

/** Confirm purchase → schedule or release escrow */
export async function confirmAndMaybeSettle(
  orderId: string,
  opts?: { actorId?: string | null; auto?: boolean }
) {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { sellerProfile: true },
  });
  if (!order) return { error: "Order not found." };

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      settlementStatus: "READY",
    },
  });

  await logMarketplaceAudit({
    orderId,
    actorId: opts?.actorId,
    action: opts?.auto
      ? MarketplaceAuditActions.AUTO_CONFIRM
      : MarketplaceAuditActions.CONFIRM,
  });

  return releaseMarketplaceEscrow(orderId, { actorId: opts?.actorId });
}

/** Cron: release held escrow that passed delay */
export async function releaseDueMarketplaceSettlementsBatch() {
  const due = await db.marketplaceOrder.findMany({
    where: {
      settlementStatus: { in: ["READY", "HELD"] },
      status: "CONFIRMED",
      confirmedAt: { not: null },
      escrowHeld: true,
    },
    take: 50,
    select: { id: true },
  });

  let settled = 0;
  let deferred = 0;
  for (const row of due) {
    const res = await releaseMarketplaceEscrow(row.id);
    if ("ok" in res && res.ok) settled += 1;
    else if ("deferred" in res && res.deferred) deferred += 1;
  }
  return { settled, deferred, checked: due.length };
}

/** Block settlement when dispute opens */
export async function holdSettlementForDispute(orderId: string, actorId?: string) {
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      settlementStatus: "BLOCKED",
      settlementHeldReason: "Dispute filed — settlement on hold",
      escrowHeld: true,
    },
  });
  await logMarketplaceAudit({
    orderId,
    actorId,
    action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
    detail: "dispute_opened",
  });
}
