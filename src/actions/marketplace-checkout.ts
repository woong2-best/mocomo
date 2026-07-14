"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { computeMarketplaceFees } from "@/lib/marketplace/constants";
import { createNotification } from "@/lib/notifications";

export async function createMarketplaceCheckout(input: {
  listingId: string;
  quantity?: number;
  optionSnapshot?: Record<string, string>;
  shipName?: string;
  shipCountry?: string;
  shipPostal?: string;
  shipAddress1?: string;
  shipAddress2?: string;
  shipPhone?: string;
  buyerNote?: string;
}) {
  if (!isStripeConfigured()) {
    return { error: "Stripe 결제가 설정되지 않았습니다." };
  }

  const buyer = await requireAuth();
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));

  const listing = await db.marketplaceListing.findUnique({
    where: { id: input.listingId },
    include: {
      seller: {
        select: {
          id: true,
          username: true,
          email: true,
          stripeConnectAccountId: true,
          stripeConnectOnboardedAt: true,
        },
      },
      sellerProfile: { select: { id: true, status: true } },
    },
  });

  if (!listing || listing.status !== "ACTIVE") {
    return { error: "판매 중인 상품이 아닙니다." };
  }
  if (listing.sellerId === buyer.id) {
    return { error: "본인 상품은 구매할 수 없습니다." };
  }
  if (listing.type !== "DIGITAL" && listing.stock < quantity) {
    return { error: "재고가 부족합니다." };
  }

  const needsShipping = listing.type !== "DIGITAL";
  if (needsShipping) {
    if (!input.shipName?.trim() || !input.shipCountry?.trim() || !input.shipAddress1?.trim()) {
      return { error: "배송지(이름·국가·주소)를 입력해 주세요." };
    }
  }

  const subtotal = listing.priceAmount * quantity;
  const shippingAmount =
    listing.type === "DIGITAL" || listing.shippingFeeType === "FREE"
      ? 0
      : listing.shippingFeeFixed;
  const fees = computeMarketplaceFees(subtotal, shippingAmount);
  const totalAmount = fees.totalAmount;

  const order = await db.marketplaceOrder.create({
    data: {
      buyerId: buyer.id,
      sellerId: listing.sellerId,
      sellerProfileId: listing.sellerProfileId ?? listing.sellerProfile?.id,
      status: "AWAITING_PAYMENT",
      subtotalAmount: subtotal,
      shippingAmount,
      platformFeeAmount: fees.platformFeeAmount,
      sellerEarnAmount: fees.sellerEarnAmount,
      currency: listing.currency || "krw",
      shipName: input.shipName?.trim() || null,
      shipCountry: input.shipCountry?.trim() || null,
      shipPostal: input.shipPostal?.trim() || null,
      shipAddress1: input.shipAddress1?.trim() || null,
      shipAddress2: input.shipAddress2?.trim() || null,
      shipPhone: input.shipPhone?.trim() || null,
      buyerNote: input.buyerNote?.trim() || null,
      items: {
        create: {
          listingId: listing.id,
          titleSnapshot: listing.title,
          optionSnapshot: (input.optionSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
          unitPrice: listing.priceAmount,
          quantity,
          listingType: listing.type,
        },
      },
    },
  });

  const paymentIntent = await db.paymentIntent.create({
    data: {
      userId: buyer.id,
      type: "MARKETPLACE",
      amount: totalAmount,
      metadata: {
        marketplaceOrderId: order.id,
        listingId: listing.id,
        sellerId: listing.sellerId,
      },
    },
  });

  const stripe = getStripe();
  const origin = getAppOrigin();
  const currency = (listing.currency || "krw").toLowerCase();
  const connectReady = Boolean(
    listing.seller.stripeConnectAccountId && listing.seller.stripeConnectOnboardedAt
  );

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    // Stripe가 국가별로 Apple Pay / Google Pay / Link 등 자동 노출
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: listing.priceAmount,
          product_data: {
            name: listing.title.slice(0, 120),
            description: `${listing.type} · ${listing.category}`.slice(0, 200),
          },
        },
        quantity,
      },
      ...(shippingAmount > 0
        ? [
            {
              price_data: {
                currency,
                unit_amount: shippingAmount,
                product_data: { name: "배송비" },
              },
              quantity: 1,
            },
          ]
        : []),
    ],
    metadata: {
      orderId: paymentIntent.id,
      type: "MARKETPLACE",
      userId: buyer.id,
      marketplaceOrderId: order.id,
    },
    success_url: `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}&market_order=${order.id}`,
    cancel_url: `${origin}/payments/fail?market_order=${order.id}`,
    customer_email: buyer.email ?? undefined,
  };

  if (connectReady && listing.seller.stripeConnectAccountId) {
    sessionParams.payment_intent_data = {
      application_fee_amount: fees.platformFeeAmount,
      transfer_data: {
        destination: listing.seller.stripeConnectAccountId,
      },
      metadata: {
        marketplaceOrderId: order.id,
        mocomoPaymentIntentId: paymentIntent.id,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.url) return { error: "결제 페이지를 만들 수 없습니다." };

  await db.marketplaceOrder.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return { checkoutUrl: session.url, orderId: order.id };
}

export async function listMyMarketplaceOrders(role: "buyer" | "seller" = "buyer") {
  const user = await requireAuth({ writeKind: "notification" });
  return db.marketplaceOrder.findMany({
    where: role === "buyer" ? { buyerId: user.id } : { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      items: true,
      shipment: true,
      buyer: { select: { username: true } },
      seller: { select: { username: true } },
    },
  });
}

export async function getMarketplaceOrderDetail(orderId: string) {
  const user = await requireAuth({ writeKind: "notification" });
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shipment: true,
      refunds: { orderBy: { createdAt: "desc" } },
      disputes: { orderBy: { createdAt: "desc" } },
      review: true,
      buyer: { select: { id: true, username: true, email: true } },
      seller: { select: { id: true, username: true } },
    },
  });
  if (!order) return null;
  if (order.buyerId !== user.id && order.sellerId !== user.id) return null;

  const downloads =
    order.buyerId === user.id
      ? await db.marketplaceDigitalDownload.findMany({ where: { orderId } })
      : [];

  return { ...order, downloads, isBuyer: order.buyerId === user.id, isSeller: order.sellerId === user.id };
}

export async function sellerUpdateShipment(input: {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status?: "PREPARING" | "SHIPPED" | "IN_CUSTOMS" | "IN_TRANSIT" | "DELIVERED";
}) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: input.orderId } });
  if (!order || order.sellerId !== user.id) return { error: "권한이 없습니다." };
  if (["CANCELLED", "REFUNDED", "CONFIRMED"].includes(order.status)) {
    return { error: "이 주문은 배송 상태를 변경할 수 없습니다." };
  }

  const status = input.status ?? "SHIPPED";
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber) return { error: "송장번호를 입력해 주세요." };

  await db.marketplaceShipment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      carrier: input.carrier.trim() || null,
      trackingNumber,
      status,
      shippedAt: status === "SHIPPED" || status === "IN_TRANSIT" ? new Date() : null,
      deliveredAt: status === "DELIVERED" ? new Date() : null,
    },
    update: {
      carrier: input.carrier.trim() || null,
      trackingNumber,
      status,
      shippedAt: status === "SHIPPED" || status === "IN_TRANSIT" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });

  const patch: { status?: typeof order.status; autoConfirmAt?: Date } = {};
  if (status === "SHIPPED" || status === "IN_TRANSIT" || status === "IN_CUSTOMS") {
    patch.status = "SHIPPED";
  }
  if (status === "DELIVERED") {
    patch.status = "DELIVERED";
    patch.autoConfirmAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  if (patch.status) {
    await db.marketplaceOrder.update({ where: { id: order.id }, data: patch });
  }

  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title: status === "DELIVERED" ? "배송이 완료되었습니다" : "상품이 발송되었습니다",
    body: `${input.carrier} ${trackingNumber}`,
    link: `/market/orders/${order.id}`,
    actorId: user.id,
  });

  revalidatePath(`/market/orders/${order.id}`);
  revalidatePath("/market/orders");
  return { success: true };
}

export async function confirmMarketplaceOrder(orderId: string) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id) return { error: "권한이 없습니다." };
  if (order.status !== "DELIVERED" && order.status !== "SHIPPED") {
    return { error: "확정할 수 있는 상태가 아닙니다." };
  }
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "구매가 확정되었습니다",
    link: `/market/orders/${orderId}`,
    actorId: user.id,
  });
  revalidatePath(`/market/orders/${orderId}`);
  return { success: true };
}

export async function requestMarketplaceRefund(orderId: string, reason: string) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id) return { error: "권한이 없습니다." };
  if (["CANCELLED", "REFUNDED", "CONFIRMED"].includes(order.status)) {
    return { error: "환불을 요청할 수 없는 상태입니다." };
  }
  const text = reason.trim();
  if (!text) return { error: "환불 사유를 입력해 주세요." };

  await db.marketplaceRefund.create({
    data: {
      orderId,
      requesterId: user.id,
      reason: text,
      amount: order.subtotalAmount + order.shippingAmount,
      status: "REQUESTED",
    },
  });
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "REFUND_REQUESTED" },
  });
  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "환불 요청",
    body: text.slice(0, 120),
    link: `/market/orders/${orderId}`,
    actorId: user.id,
  });
  revalidatePath(`/market/orders/${orderId}`);
  return { success: true };
}

export async function sellerRespondMarketplaceRefund(
  refundId: string,
  approve: boolean
) {
  const user = await requireAuth();
  const refund = await db.marketplaceRefund.findUnique({
    where: { id: refundId },
    include: { order: true },
  });
  if (!refund || refund.order.sellerId !== user.id) return { error: "권한이 없습니다." };
  if (refund.status !== "REQUESTED" && refund.status !== "SELLER_REVIEW") {
    return { error: "이미 처리된 환불입니다." };
  }

  if (!approve) {
    await db.marketplaceRefund.update({
      where: { id: refundId },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    await db.marketplaceOrder.update({
      where: { id: refund.orderId },
      data: { status: "PAID" },
    });
    await createNotification({
      userId: refund.order.buyerId,
      type: "SYSTEM",
      title: "환불이 거절되었습니다",
      link: `/market/orders/${refund.orderId}`,
      actorId: user.id,
    });
    revalidatePath(`/market/orders/${refund.orderId}`);
    return { success: true };
  }

  // Stripe 환불
  let stripeRefundId: string | undefined;
  if (isStripeConfigured() && refund.order.stripePaymentIntentId) {
    try {
      const stripe = getStripe();
      let paymentIntentId = refund.order.stripePaymentIntentId;
      if (paymentIntentId.startsWith("cs_")) {
        const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
        paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? paymentIntentId;
      }
      if (paymentIntentId.startsWith("pi_")) {
        const refunded = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: refund.amount,
        });
        stripeRefundId = refunded.id;
      }
    } catch {
      /* Connect refund may need transfer reversal — APPROVED for admin follow-up */
    }
  }

  await db.marketplaceRefund.update({
    where: { id: refundId },
    data: {
      status: stripeRefundId ? "COMPLETED" : "APPROVED",
      stripeRefundId,
      decidedAt: new Date(),
    },
  });
  await db.marketplaceOrder.update({
    where: { id: refund.orderId },
    data: { status: "REFUNDED" },
  });

  // 재고 복원
  for (const item of await db.marketplaceOrderItem.findMany({ where: { orderId: refund.orderId } })) {
    if (item.listingType === "DIGITAL") continue;
    await db.marketplaceListing.update({
      where: { id: item.listingId },
      data: {
        stock: { increment: item.quantity },
        status: "ACTIVE",
        salesCount: { decrement: item.quantity },
      },
    });
  }

  await createNotification({
    userId: refund.order.buyerId,
    type: "SYSTEM",
    title: "환불이 승인되었습니다",
    link: `/market/orders/${refund.orderId}`,
    actorId: user.id,
  });
  revalidatePath(`/market/orders/${refund.orderId}`);
  return { success: true };
}

export async function openMarketplaceDispute(orderId: string, reason: string) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order || (order.buyerId !== user.id && order.sellerId !== user.id)) {
    return { error: "권한이 없습니다." };
  }
  const text = reason.trim();
  if (!text) return { error: "분쟁 사유를 입력해 주세요." };

  await db.marketplaceDispute.create({
    data: {
      orderId,
      openerId: user.id,
      reason: text,
      status: "OPEN",
    },
  });
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "DISPUTED" },
  });

  const otherId = order.buyerId === user.id ? order.sellerId : order.buyerId;
  await createNotification({
    userId: otherId,
    type: "SYSTEM",
    title: "분쟁이 접수되었습니다",
    body: text.slice(0, 120),
    link: `/market/orders/${orderId}`,
    actorId: user.id,
  });

  revalidatePath(`/market/orders/${orderId}`);
  revalidatePath("/admin/market");
  return { success: true };
}

export async function cancelMarketplaceOrder(orderId: string) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id) return { error: "권한이 없습니다." };
  if (order.status !== "AWAITING_PAYMENT" && order.status !== "PAID" && order.status !== "PREPARING") {
    return { error: "배송 시작 전만 취소할 수 있습니다. 이후에는 반품·환불을 이용해 주세요." };
  }
  if (order.status === "PAID" || order.status === "PREPARING") {
    // 결제 후 취소 → 환불 요청으로 전환
    return requestMarketplaceRefund(orderId, "배송 전 주문 취소");
  }
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath(`/market/orders/${orderId}`);
  return { success: true };
}

export async function submitMarketplaceReview(input: {
  orderId: string;
  rating: number;
  body?: string;
  mediaUrls?: string[];
}) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({
    where: { id: input.orderId },
    include: { items: true, review: true },
  });
  if (!order || order.buyerId !== user.id) return { error: "권한이 없습니다." };
  if (order.status !== "CONFIRMED" && order.status !== "DELIVERED") {
    return { error: "구매 확정 후 리뷰를 작성할 수 있습니다." };
  }
  if (order.review) return { error: "이미 리뷰를 작성했습니다." };
  const rating = Math.min(5, Math.max(1, Math.floor(input.rating)));
  const listingId = order.items[0]?.listingId;
  if (!listingId) return { error: "상품 정보가 없습니다." };

  await db.marketplaceReview.create({
    data: {
      orderId: order.id,
      listingId,
      authorId: user.id,
      rating,
      body: input.body?.trim() || null,
      mediaUrls: (input.mediaUrls ?? []).slice(0, 6),
    },
  });

  const agg = await db.marketplaceReview.aggregate({
    where: { listing: { sellerId: order.sellerId } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await db.marketplaceSellerProfile.updateMany({
    where: { userId: order.sellerId },
    data: {
      ratingAvg: agg._avg.rating ?? rating,
      ratingCount: agg._count.rating,
    },
  });

  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "새 리뷰가 등록되었습니다",
    body: `★${rating}`,
    link: `/market/i/${listingId}`,
    actorId: user.id,
  });

  revalidatePath(`/market/orders/${order.id}`);
  revalidatePath(`/market/i/${listingId}`);
  return { success: true };
}
