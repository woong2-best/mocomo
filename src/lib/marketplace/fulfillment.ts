import { db } from "@/lib/db";
import {
  computeMarketplaceFees,
} from "@/lib/marketplace/constants";
import { marketplaceAutoConfirmAtFromDelivery, applyDeliveryFallbackBatch } from "@/lib/marketplace/delivery-pipeline";
import { createNotification } from "@/lib/notifications";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import {
  confirmAndMaybeSettle,
  releaseDueMarketplaceSettlementsBatch,
} from "@/lib/marketplace/escrow";
import { MARKETPLACE_DISPUTE_WINDOW_HOURS } from "@/lib/marketplace/protection-config";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

/** 결제 승인( auth hold ) 후 주문 활성화 — 재고 원자성. 판매자 정산은 구매확정 후 capture. */
export async function fulfillMarketplaceOrder(params: {
  marketplaceOrderId: string;
  paymentIntentDbId: string;
  paymentRef: string;
  amount: number;
}) {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: params.marketplaceOrderId },
    include: {
      items: true,
      seller: { select: { id: true, username: true } },
      buyer: { select: { id: true, username: true, email: true } },
    },
  });
  if (!order) return { error: "주문을 찾을 수 없습니다." };
  if (order.status !== "AWAITING_PAYMENT" && order.status !== "ADMIN_REVIEW") {
    if (["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED", "SETTLED"].includes(order.status)) {
      return { ok: true as const, alreadyPaid: true };
    }
  }
  if (order.status !== "AWAITING_PAYMENT") {
    // ADMIN_REVIEW before pay shouldn't happen; still bind payment
    if (order.stripePaymentIntentId) return { ok: true as const, alreadyPaid: true };
  }

  const expected = order.subtotalAmount + order.shippingAmount;
  if (expected !== params.amount && !order.usedListingId) {
    return { error: "결제 금액이 주문과 일치하지 않습니다." };
  }
  if (order.usedListingId && params.amount < order.subtotalAmount) {
    return { error: "결제 금액이 낙찰가보다 적습니다." };
  }

  for (const item of order.items) {
    if (item.usedListingId) {
      await db.usedListing.update({
        where: { id: item.usedListingId },
        data: { status: "RESERVED" },
      });
      continue;
    }
    if (!item.listingId) continue;
    if (item.listingType === "DIGITAL") continue;
    const updated = await db.marketplaceListing.updateMany({
      where: { id: item.listingId, stock: { gte: item.quantity } },
      data: {
        stock: { decrement: item.quantity },
        salesCount: { increment: item.quantity },
      },
    });
    if (updated.count === 0) {
      return { error: "재고가 부족하여 주문을 확정할 수 없습니다." };
    }
    const listing = await db.marketplaceListing.findUnique({
      where: { id: item.listingId },
      select: { stock: true },
    });
    if (listing && listing.stock <= 0) {
      await db.marketplaceListing.update({
        where: { id: item.listingId },
        data: { status: "SOLD_OUT" },
      });
    }
  }

  for (const item of order.items) {
    if (item.usedListingId || !item.listingId) continue;
    if (item.listingType !== "DIGITAL") continue;
    await db.marketplaceListing.update({
      where: { id: item.listingId },
      data: { salesCount: { increment: item.quantity } },
    });
  }

  const holdForReview = order.adminReviewRequired;

  await db.marketplaceOrder.update({
    where: { id: order.id },
    data: {
      status: holdForReview ? "ADMIN_REVIEW" : "PAID",
      settlementStatus: holdForReview ? "BLOCKED" : "PENDING",
      escrowHeld: true,
      stripePaymentIntentId: params.paymentRef,
      stripeCheckoutSessionId: params.paymentRef,
      settlementHeldReason: holdForReview ? "위험 거래 — 관리자 검토" : null,
    },
  });

  for (const item of order.items) {
    if (item.listingType !== "DIGITAL") continue;
    const listing = await db.marketplaceListing.findUnique({
      where: { id: item.listingId },
      select: {
        digitalFileUrl: true,
        digitalDownloadLimit: true,
        digitalExpiresDays: true,
      },
    });
    if (!listing?.digitalFileUrl) continue;
    const expiresAt =
      listing.digitalExpiresDays && listing.digitalExpiresDays > 0
        ? new Date(Date.now() + listing.digitalExpiresDays * 24 * 60 * 60 * 1000)
        : null;
    await db.marketplaceDigitalDownload.create({
      data: {
        orderId: order.id,
        orderItemId: item.id,
        listingId: item.listingId,
        buyerId: order.buyerId,
        fileUrl: listing.digitalFileUrl,
        maxDownloads: listing.digitalDownloadLimit ?? 5,
        expiresAt,
      },
    });
  }

  const needsShip = order.items.some((i) => i.listingType !== "DIGITAL");
  if (!holdForReview) {
    if (needsShip) {
      await db.marketplaceOrder.update({
        where: { id: order.id },
        data: { status: "PREPARING" },
      });
      await db.marketplaceShipment.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, status: "PREPARING" },
        update: {},
      });
    } else {
      const confirmAt = marketplaceAutoConfirmAtFromDelivery();
      await db.marketplaceOrder.update({
        where: { id: order.id },
        data: { status: "DELIVERED", autoConfirmAt: confirmAt },
      });
    }
  }

  // Platform fee + gross ledger recorded at capture (releaseMarketplaceEscrow)

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: order.sellerId },
    data: { salesCount: { increment: 1 } },
  });

  await logMarketplaceAudit({
    orderId: order.id,
    actorId: order.buyerId,
    action: MarketplaceAuditActions.PAYMENT,
    detail: holdForReview ? "paid_admin_review" : "paid_escrow_held",
    metadata: { amount: params.amount, paymentRef: params.paymentRef },
  });

  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: holdForReview
      ? "주문이 관리자 검토 중입니다"
      : `새 ${MARKET_BRAND_NAME} 주문이 들어왔습니다`,
    body: `${order.buyer.username}님이 결제했습니다. 정산은 구매 확정 후 진행됩니다.`,
    link: `/market/orders/${order.id}`,
    actorId: order.buyerId,
  });
  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title: "결제가 완료되었습니다",
    body: holdForReview
      ? "안전 검토 후 주문 처리가 이어집니다."
      : order.usedListingId
        ? "주문 내역에서 배송·추적을 확인하세요. 배송 완료 후 72시간 뒤 자동 구매확정됩니다."
        : "주문 내역에서 배송·다운로드를 확인하세요. 구매 확정 전까지 결제 승인(보류) 상태입니다.",
    link: `/market/orders/${order.id}`,
  });

  try {
    const priorSales = await db.marketplaceOrder.count({
      where: {
        sellerId: order.sellerId,
        id: { not: order.id },
        status: {
          in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED", "SETTLED", "ADMIN_REVIEW"],
        },
      },
    });
    if (priorSales === 0) {
      const { runPromotionTrigger } = await import("@/lib/admin/services/promotions");
      await runPromotionTrigger("ON_FIRST_SALE", order.sellerId);
    }
  } catch {
    /* ignore */
  }

  return { ok: true as const, orderId: order.id };
}

export async function autoConfirmMarketplaceOrdersBatch() {
  const fallback = await applyDeliveryFallbackBatch(50);

  const due = await db.marketplaceOrder.findMany({
    where: {
      status: "DELIVERED",
      autoConfirmAt: { lte: new Date() },
    },
    take: 50,
    select: { id: true, buyerId: true, sellerId: true },
  });

  let confirmed = 0;
  for (const row of due) {
    const res = await confirmAndMaybeSettle(row.id, { auto: true });
    if ("error" in res && res.error && !("deferred" in res && res.deferred)) {
      // still mark confirmed via confirmAndMaybeSettle path — deferred is ok
      continue;
    }
    await createNotification({
      userId: row.buyerId,
      type: "SYSTEM",
      title: "구매가 자동 확정되었습니다",
      body: `배송 완료 후 ${MARKETPLACE_DISPUTE_WINDOW_HOURS}시간이 지나 자동 구매확정되었습니다.`,
      link: `/market/orders/${row.id}`,
    });
    confirmed += 1;
  }

  const settlements = await releaseDueMarketplaceSettlementsBatch();
  return { confirmed, ...settlements, deliveryFallback: fallback };
}

export { computeMarketplaceFees, releaseDueMarketplaceSettlementsBatch };
