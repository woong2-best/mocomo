import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { creditSellerEarning } from "@/lib/settlement";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { refreshSellerTrust, settlementDelayDaysForSeller } from "@/lib/marketplace/trust";
import { createNotification } from "@/lib/notifications";

/**
 * Escrow: platform holds funds until purchase confirm (+ tier delay).
 * Connect sellers get Stripe Transfer; others get wallet credit.
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

  const connectReady = Boolean(
    order.seller.stripeConnectAccountId && order.seller.stripeConnectOnboardedAt
  );

  let transferId: string | undefined;

  if (connectReady && isStripeConfigured() && order.seller.stripeConnectAccountId) {
    try {
      const stripe = getStripe();
      const currency = (order.currency || "krw").toLowerCase();
      const transfer = await stripe.transfers.create({
        amount: order.sellerEarnAmount,
        currency,
        destination: order.seller.stripeConnectAccountId,
        transfer_group: order.id,
        metadata: {
          marketplaceOrderId: order.id,
          type: "marketplace_escrow_release",
        },
      });
      transferId = transfer.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe transfer failed";
      await logMarketplaceAudit({
        orderId,
        actorId: opts?.actorId,
        action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
        detail: msg,
      });
      return { error: `정산 이체 실패: ${msg}` };
    }
  } else {
    // Platform wallet escrow release (non-Connect sellers)
    await creditSellerEarning(order.sellerId, order.sellerEarnAmount, {
      referenceType: "marketplace_escrow",
      referenceId: order.id,
      memo: `MARKET 에스크로 정산 #${order.id.slice(0, 8)}`,
    });
  }

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      status: "SETTLED",
      settlementStatus: "SETTLED",
      escrowHeld: false,
      settledAt: new Date(),
      stripeTransferId: transferId ?? null,
      settlementHeldReason: null,
    },
  });

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: order.sellerId },
    data: { confirmedOrderCount: { increment: 1 } },
  });

  await refreshSellerTrust(order.sellerId).catch(() => null);

  await logMarketplaceAudit({
    orderId,
    actorId: opts?.actorId,
    action: MarketplaceAuditActions.SETTLEMENT,
    detail: transferId ? `transfer:${transferId}` : "wallet_credit",
    metadata: { amount: order.sellerEarnAmount, transferId },
  });

  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "정산이 완료되었습니다",
    body: `${order.sellerEarnAmount.toLocaleString()}원이 정산되었습니다.`,
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
