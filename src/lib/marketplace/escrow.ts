import { safeLogWarn } from "@/lib/safe-log";
import { db } from "@/lib/db";
import { isStripeConnectPayoutReady } from "@/lib/stripe-connect";
import { recordMarketplaceSettlementLedger, recordPlatformFee, recordPaymentGross } from "@/lib/settlement";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { finalizeUsedListingSold } from "@/lib/subculture-commerce/sale-records";
import { refreshSellerTrust, settlementDelayDaysForSeller } from "@/lib/marketplace/trust";
import { createNotification } from "@/lib/notifications";
import { formatUsd } from "@/lib/money";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import {
  captureMarketplacePaymentIntent,
  resolveMarketplaceStripePaymentIntentId,
} from "@/lib/marketplace/stripe-payment";

/**
 * Escrow: auth hold until purchase confirm (+ tier delay), then PI capture.
 * Connect destination transfer + application fee occur at capture — not before.
 * Dispute exposure after capture sits in seller Connect account reserve.
 */
export async function releaseMarketplaceEscrow(
  orderId: string,
  opts?: { actorId?: string | null; force?: boolean }
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

  if (!order) return { error: "주문을 찾을 수 없습니다." };
  if (order.settlementStatus === "SETTLED") return { ok: true };
  if (order.status === "REFUNDED" || order.status === "CANCELLED") {
    return { error: "환불·취소된 주문은 정산할 수 없습니다." };
  }
  if (order.disputes.length > 0 && !opts?.force) {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "BLOCKED",
        settlementHeldReason: "열린 분쟁으로 정산 보류",
      },
    });
    await logMarketplaceAudit({
      orderId,
      actorId: opts?.actorId,
      action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
      detail: "open_dispute",
    });
    return { error: "분쟁 중이라 정산이 보류되었습니다.", deferred: true };
  }

  if (
    order.status !== "CONFIRMED" &&
    order.status !== "SETTLED" &&
    !opts?.force
  ) {
    return { error: "구매 확정 후에만 정산할 수 있습니다." };
  }

  const profile = order.sellerProfile;
  if (profile?.settlementBlocked || profile?.sanctionLevel === "SETTLEMENT_HELD") {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "BLOCKED",
        settlementHeldReason: "판매자 정산 보류 제재",
      },
    });
    return { error: "판매자 정산이 제재로 보류되었습니다.", deferred: true };
  }
  if (profile?.sanctionLevel === "PERMANENT_BAN") {
    return { error: "영구 판매 금지 계정입니다." };
  }

  if (!opts?.force && order.confirmedAt && profile) {
    const delayDays = settlementDelayDaysForSeller(profile);
    const readyAt = new Date(
      order.confirmedAt.getTime() + delayDays * 24 * 60 * 60 * 1000
    );
    if (Date.now() < readyAt.getTime()) {
      await db.marketplaceOrder.update({
        where: { id: orderId },
        data: {
          settlementStatus: "HELD",
          settlementHeldReason: `신규/신뢰도 정책: ${delayDays}일 후 정산 (${readyAt.toISOString().slice(0, 10)})`,
        },
      });
      return {
        error: `정산 대기 중 (예정: ${readyAt.toISOString().slice(0, 10)})`,
        deferred: true,
      };
    }
  }

  if (order.adminReviewRequired && !opts?.force) {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "BLOCKED",
        settlementHeldReason: "관리자 검토 필요",
      },
    });
    return { error: "관리자 검토가 필요한 주문입니다.", deferred: true };
  }

  const connectReady = await isStripeConnectPayoutReady(order.seller.stripeConnectAccountId);

  if (!connectReady || !order.seller.stripeConnectAccountId) {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        settlementStatus: "HELD",
        settlementHeldReason: "Stripe Connect 정산 설정 미완료 — 판매자센터에서 Connect 온보딩을 완료해 주세요.",
      },
    });
    return {
      error: "Stripe Connect 정산이 활성화되지 않아 정산을 보류했습니다.",
      deferred: true,
    };
  }

  const storedRef = order.stripePaymentIntentId ?? order.stripeCheckoutSessionId;
  const captureRes = await captureMarketplacePaymentIntent(storedRef);
  if ("error" in captureRes) {
    await logMarketplaceAudit({
      orderId,
      actorId: opts?.actorId,
      action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
      detail: captureRes.error,
    });
    if (order.usedListingId) {
      const { handleUsedAuctionOrderCaptureFailure } = await import(
        "@/lib/used-auction-marketplace-order"
      );
      await handleUsedAuctionOrderCaptureFailure(orderId, captureRes.error).catch((e) => {
        safeLogWarn("used-auction-capture-fail-handoff", { orderId, err: String(e) });
      });
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
    title: "정산이 완료되었습니다",
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
  if (!order) return { error: "주문을 찾을 수 없습니다." };

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
      settlementHeldReason: "분쟁 접수 — 정산 보류",
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
