import { db } from "@/lib/db";
import {
  AUTO_CONFIRM_DAYS_AFTER_DELIVERY,
  computeMarketplaceFees,
} from "@/lib/marketplace/constants";
import { createNotification } from "@/lib/notifications";
import { creditSellerEarning, recordPlatformFee } from "@/lib/settlement";

/** 결제 완료 후 주문 활성화 — 재고 원자성 포함 */
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
  if (order.status !== "AWAITING_PAYMENT") {
    return { ok: true as const, alreadyPaid: true };
  }

  const expected = order.subtotalAmount + order.shippingAmount;
  if (expected !== params.amount) {
    return { error: "결제 금액이 주문과 일치하지 않습니다." };
  }

  // 재고 원자성: stock >= qty 조건으로만 차감
  for (const item of order.items) {
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
    if (item.listingType === "DIGITAL") {
      await db.marketplaceListing.update({
        where: { id: item.listingId },
        data: { salesCount: { increment: item.quantity } },
      });
    }
  }

  const paid = await db.marketplaceOrder.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      stripePaymentIntentId: params.paymentRef,
      stripeCheckoutSessionId: params.paymentRef,
    },
  });

  // 디지털 다운로드 entitlement
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

  // 실물/주문제작 → 준비중 + 배송 레코드
  const needsShip = order.items.some((i) => i.listingType !== "DIGITAL");
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
    // 디지털만 — 즉시 배송완료→구매확정 가능
    const confirmAt = new Date(Date.now() + AUTO_CONFIRM_DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000);
    await db.marketplaceOrder.update({
      where: { id: order.id },
      data: { status: "DELIVERED", autoConfirmAt: confirmAt },
    });
  }

  await recordPlatformFee(order.platformFeeAmount, {
    referenceType: "marketplace",
    referenceId: order.id,
    paymentIntentId: params.paymentIntentDbId,
    memo: `MARKET 수수료 #${order.id.slice(0, 8)}`,
  });

  // Connect destination charge면 Stripe가 판매자에게 직접 지급 — 지갑 적립은 Connect 미연동 시만
  const seller = await db.user.findUnique({
    where: { id: order.sellerId },
    select: { stripeConnectAccountId: true, stripeConnectOnboardedAt: true },
  });
  const connectReady = Boolean(seller?.stripeConnectAccountId && seller.stripeConnectOnboardedAt);
  if (!connectReady) {
    await creditSellerEarning(order.sellerId, order.sellerEarnAmount, {
      referenceType: "marketplace",
      referenceId: order.id,
      paymentIntentId: params.paymentIntentDbId,
      memo: `MARKET 판매 #${order.id.slice(0, 8)}`,
    });
  }

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: order.sellerId },
    data: { salesCount: { increment: 1 } },
  });

  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "새 MARKET 주문이 들어왔습니다",
    body: `${order.buyer.username}님이 결제했습니다.`,
    link: `/market/orders/${order.id}`,
    actorId: order.buyerId,
  });
  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title: "결제가 완료되었습니다",
    body: "주문 내역에서 배송·다운로드를 확인하세요.",
    link: `/market/orders/${order.id}`,
  });

  return { ok: true as const, orderId: paid.id };
}

export async function autoConfirmMarketplaceOrdersBatch() {
  const due = await db.marketplaceOrder.findMany({
    where: {
      status: "DELIVERED",
      autoConfirmAt: { lte: new Date() },
    },
    take: 100,
    select: { id: true, buyerId: true, sellerId: true },
  });

  let confirmed = 0;
  for (const row of due) {
    await db.marketplaceOrder.update({
      where: { id: row.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    await createNotification({
      userId: row.buyerId,
      type: "SYSTEM",
      title: "구매가 자동 확정되었습니다",
      body: "배송 완료 후 7일이 지나 자동 확정되었습니다.",
      link: `/market/orders/${row.id}`,
    });
    await createNotification({
      userId: row.sellerId,
      type: "SYSTEM",
      title: "구매 확정",
      body: "주문이 구매 확정되었습니다.",
      link: `/market/orders/${row.id}`,
    });
    confirmed += 1;
  }
  return { confirmed };
}

export { computeMarketplaceFees };
