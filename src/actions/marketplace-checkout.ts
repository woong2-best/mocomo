"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  stripeCheckoutReturnUrls,
  type CheckoutPlatform,
} from "@/lib/stripe-checkout-service";
import { computeMarketplaceFees } from "@/lib/marketplace/constants";
import {
  getCarrierById,
  listingShipsToCountry,
  normalizeShipCountry,
  UNSUPPORTED_ADDRESS_COUNTRY_MESSAGE,
  UNSUPPORTED_SHIP_COUNTRY_MESSAGE,
} from "@/lib/marketplace/shipping-config";
import { getTrackingProvider } from "@/lib/marketplace/tracking";
import { createNotification } from "@/lib/notifications";
import {
  assessMarketplaceCheckoutRisk,
  applyOrderRiskFlags,
} from "@/lib/marketplace/risk";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import {
  confirmAndMaybeSettle,
  holdSettlementForDispute,
} from "@/lib/marketplace/escrow";
import type { MarketplaceDisputeReason } from "@prisma/client";
import {
  getOrCreateStripeCustomer,
  listSavedPaymentMethods,
} from "@/lib/stripe-payment-methods";

/** How long an unpaid order stays reusable for the same buyer + listing. */
const ORDER_REUSE_WINDOW_MS = 60 * 60 * 1000;

export type MarketplaceCheckoutInput = {
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
};

type MarketplaceListingRow = NonNullable<
  Awaited<ReturnType<typeof db.marketplaceListing.findUnique>>
> & {
  seller: {
    id: string;
    username: string | null;
    email: string | null;
    stripeConnectAccountId: string | null;
    stripeConnectOnboardedAt: Date | null;
  };
  sellerProfile: { id: string; status: string } | null;
};

type MarketplaceInitResult = {
  order: { id: string };
  paymentIntent: { id: string };
  listing: MarketplaceListingRow;
  quantity: number;
  /** Price the order was placed at, not whatever the listing says right now. */
  unitAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
};

async function initMarketplacePurchase(
  buyer: { id: string },
  input: MarketplaceCheckoutInput
): Promise<{ error: string } | MarketplaceInitResult> {
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
  if (listing.sellerProfile?.status === "SUSPENDED" || listing.sellerProfile?.status === "REJECTED") {
    return { error: "현재 구매할 수 없는 판매자입니다." };
  }
  if (listing.type !== "DIGITAL" && listing.stock < quantity) {
    return { error: "재고가 부족합니다." };
  }

  const sellerProfileCheck = await db.marketplaceSellerProfile.findUnique({
    where: { userId: listing.sellerId },
    select: { sanctionLevel: true, settlementBlocked: true },
  });
  if (
    sellerProfileCheck?.sanctionLevel === "PERMANENT_BAN" ||
    sellerProfileCheck?.sanctionLevel === "SALES_SUSPENDED"
  ) {
    return { error: "판매가 제한된 판매자입니다." };
  }

  const needsShipping = listing.type !== "DIGITAL";
  if (needsShipping) {
    if (!input.shipName?.trim() || !input.shipCountry?.trim() || !input.shipAddress1?.trim()) {
      return { error: "배송지(이름·국가·주소)를 입력해 주세요." };
    }
    const dest = normalizeShipCountry(input.shipCountry);
    if (!dest) {
      return { error: UNSUPPORTED_ADDRESS_COUNTRY_MESSAGE };
    }
    if (
      !listingShipsToCountry(listing.shipToCountries, listing.shipsWorldwide, dest)
    ) {
      return { error: UNSUPPORTED_SHIP_COUNTRY_MESSAGE };
    }
  }

  const subtotal = listing.priceAmount * quantity;
  const shippingAmount =
    listing.type === "DIGITAL" || listing.shippingFeeType === "FREE"
      ? 0
      : listing.shippingFeeFixed;
  const fees = computeMarketplaceFees(subtotal, shippingAmount);
  const totalAmount = fees.totalAmount;

  const shippingFields = {
    shipName: input.shipName?.trim() || null,
    shipCountry: needsShipping ? normalizeShipCountry(input.shipCountry) : null,
    shipPostal: input.shipPostal?.trim() || null,
    shipAddress1: input.shipAddress1?.trim() || null,
    shipAddress2: input.shipAddress2?.trim() || null,
    shipPhone: input.shipPhone?.trim() || null,
    buyerNote: input.buyerNote?.trim() || null,
  };

  // Opening the checkout sheet calls this. Without a reuse window, cancel-and-
  // retry leaves a trail of dead orders and open Stripe intents per buyer, which
  // also feeds bogus velocity into the risk assessment below.
  const reusable = await db.marketplaceOrder.findFirst({
    where: {
      buyerId: buyer.id,
      status: "AWAITING_PAYMENT",
      subtotalAmount: subtotal,
      shippingAmount,
      createdAt: { gt: new Date(Date.now() - ORDER_REUSE_WINDOW_MS) },
      items: { some: { listingId: listing.id, quantity } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (reusable) {
    const openIntent = await db.paymentIntent.findFirst({
      where: {
        userId: buyer.id,
        type: "MARKETPLACE",
        status: "PENDING",
        amount: totalAmount,
        metadata: { path: ["marketplaceOrderId"], equals: reusable.id },
      },
      orderBy: { createdAt: "desc" },
    });
    if (openIntent) {
      const order = await db.marketplaceOrder.update({
        where: { id: reusable.id },
        data: shippingFields,
      });
      return {
        order,
        paymentIntent: openIntent,
        listing,
        quantity,
        unitAmount: listing.priceAmount,
        shippingAmount,
        totalAmount,
        currency: (listing.currency || "usd").toLowerCase(),
      };
    }
  }

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
      currency: listing.currency || "usd",
      ...shippingFields,
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

  const risk = await assessMarketplaceCheckoutRisk({
    buyerId: buyer.id,
    sellerId: listing.sellerId,
    listingId: listing.id,
    priceAmount: listing.priceAmount,
    quantity,
  });
  await applyOrderRiskFlags(order.id, risk, buyer.id);

  return {
    order,
    paymentIntent,
    listing,
    quantity,
    unitAmount: listing.priceAmount,
    shippingAmount,
    totalAmount,
    currency: (listing.currency || "usd").toLowerCase(),
  };
}

function marketplaceStripeMetadata(
  paymentIntentId: string,
  buyerId: string,
  marketplaceOrderId: string,
  listingId: string,
  sellerId: string
) {
  return {
    orderId: paymentIntentId,
    type: "MARKETPLACE",
    userId: buyerId,
    marketplaceOrderId,
    listingId,
    sellerId,
    mocomoPaymentIntentId: paymentIntentId,
    escrow: "platform_hold",
  };
}

async function createMarketplaceCheckoutSession(
  buyer: { id: string; email?: string | null },
  init: MarketplaceInitResult,
  platform: CheckoutPlatform
) {
  const stripe = getStripe();
  const origin = getAppOrigin();
  const returnUrls = stripeCheckoutReturnUrls(platform);
  const successUrl =
    platform === "web"
      ? `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}&market_order=${init.order.id}`
      : returnUrls.successUrl;
  const cancelUrl =
    platform === "web"
      ? `${origin}/payments/fail?market_order=${init.order.id}`
      : returnUrls.cancelUrl;

  const customerId = await getOrCreateStripeCustomer(buyer.id, buyer.email);

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: init.currency,
          unit_amount: init.unitAmount,
          product_data: {
            name: init.listing.title.slice(0, 120),
            description: `${init.listing.type} · ${init.listing.category}`.slice(0, 200),
          },
        },
        quantity: init.quantity,
      },
      ...(init.shippingAmount > 0
        ? [
            {
              price_data: {
                currency: init.currency,
                unit_amount: init.shippingAmount,
                product_data: { name: "배송비" },
              },
              quantity: 1,
            },
          ]
        : []),
    ],
    metadata: {
      orderId: init.paymentIntent.id,
      type: "MARKETPLACE",
      userId: buyer.id,
      marketplaceOrderId: init.order.id,
    },
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: marketplaceStripeMetadata(
        init.paymentIntent.id,
        buyer.id,
        init.order.id,
        init.listing.id,
        init.listing.sellerId
      ),
      transfer_group: init.order.id,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.url) return { error: "결제 페이지를 만들 수 없습니다." };

  await db.marketplaceOrder.update({
    where: { id: init.order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return {
    checkoutUrl: session.url,
    orderId: init.paymentIntent.id,
    marketplaceOrderId: init.order.id,
  };
}

/** Saved-card sheet: create order + Stripe PaymentIntent with wallet customer */
export async function prepareMarketplacePaymentForBuyer(
  buyer: { id: string; email?: string | null },
  input: MarketplaceCheckoutInput,
  _platform: CheckoutPlatform = "web"
) {
  if (!isStripeConfigured()) {
    return { error: "Stripe 결제가 설정되지 않았습니다." };
  }

  const init = await initMarketplacePurchase(buyer, input);
  if ("error" in init) return init;

  const customerId = await getOrCreateStripeCustomer(buyer.id, buyer.email);
  const stripe = getStripe();

  const pi = await stripe.paymentIntents.create({
    amount: init.totalAmount,
    currency: init.currency,
    customer: customerId,
    description: init.listing.title.slice(0, 200),
    metadata: marketplaceStripeMetadata(
      init.paymentIntent.id,
      buyer.id,
      init.order.id,
      init.listing.id,
      init.listing.sellerId
    ),
    transfer_group: init.order.id,
    automatic_payment_methods: { enabled: true },
    setup_future_usage: "off_session",
  });

  await db.paymentIntent.update({
    where: { id: init.paymentIntent.id },
    data: { paymentKey: pi.id },
  });

  const methods = await listSavedPaymentMethods(buyer.id);

  return {
    orderId: init.paymentIntent.id,
    marketplaceOrderId: init.order.id,
    clientSecret: pi.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    methods,
    amount: init.totalAmount,
    orderName: init.listing.title,
  };
}

/** New-card fallback for an already-prepared marketplace payment */
export async function createMarketplaceCheckoutSessionForPaymentIntent(
  buyer: { id: string; email?: string | null },
  paymentIntentDbId: string,
  platform: CheckoutPlatform = "web"
) {
  if (!isStripeConfigured()) {
    return { error: "Stripe 결제가 설정되지 않았습니다." };
  }

  const paymentIntent = await db.paymentIntent.findUnique({
    where: { id: paymentIntentDbId },
  });
  if (!paymentIntent || paymentIntent.userId !== buyer.id) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }
  if (paymentIntent.type !== "MARKETPLACE") {
    return { error: "마켓 결제가 아닙니다." };
  }
  if (paymentIntent.status === "PAID") {
    return { error: "이미 결제된 주문입니다." };
  }

  const meta = paymentIntent.metadata as Record<string, string | undefined>;
  const marketplaceOrderId = meta.marketplaceOrderId;
  const listingId = meta.listingId;
  if (!marketplaceOrderId || !listingId) {
    return { error: "주문 정보가 올바르지 않습니다." };
  }

  const order = await db.marketplaceOrder.findUnique({
    where: { id: marketplaceOrderId },
    include: { items: true },
  });
  if (!order || order.buyerId !== buyer.id || order.status !== "AWAITING_PAYMENT") {
    return { error: "주문을 찾을 수 없습니다." };
  }

  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId },
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
  if (!listing) return { error: "상품을 찾을 수 없습니다." };

  if (listing.status !== "ACTIVE") {
    return { error: "판매가 중단된 상품입니다." };
  }

  const item = order.items[0];
  const quantity = item?.quantity ?? 1;
  // Charge the price the order was placed at. Re-reading listing.priceAmount
  // here would collect the seller's edited price, which fulfillMarketplaceOrder
  // then rejects as a mismatch — after the buyer has already paid.
  const unitAmount = item?.unitPrice ?? 0;
  if (unitAmount * quantity + order.shippingAmount !== paymentIntent.amount) {
    return { error: "주문 금액이 올바르지 않습니다. 다시 주문해 주세요." };
  }

  if (paymentIntent.paymentKey) {
    const stripe = getStripe();
    try {
      await stripe.paymentIntents.cancel(paymentIntent.paymentKey);
    } catch {
      // Cancel also fails once the intent has already gone through, and the
      // local record can still say unpaid until the webhook lands. Handing out
      // a fresh checkout session here would charge the buyer twice.
      const existing = await stripe.paymentIntents.retrieve(paymentIntent.paymentKey);
      if (existing.status === "succeeded" || existing.status === "processing") {
        return { error: "이미 결제가 진행된 주문입니다." };
      }
    }
    // The stored key now points at a dead intent; leaving it behind breaks the
    // saved-card path, which confirms whatever paymentKey holds.
    await db.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: { paymentKey: null },
    });
  }

  return createMarketplaceCheckoutSession(
    buyer,
    {
      order: { id: order.id },
      paymentIntent: { id: paymentIntent.id },
      listing,
      quantity,
      unitAmount,
      shippingAmount: order.shippingAmount,
      totalAmount: paymentIntent.amount,
      currency: (order.currency || "usd").toLowerCase(),
    },
    platform
  );
}

export async function createMarketplaceCheckoutForBuyer(
  buyer: { id: string; email?: string | null },
  input: MarketplaceCheckoutInput,
  platform: CheckoutPlatform = "web"
) {
  if (!isStripeConfigured()) {
    return { error: "Stripe 결제가 설정되지 않았습니다." };
  }

  const init = await initMarketplacePurchase(buyer, input);
  if ("error" in init) return init;

  return createMarketplaceCheckoutSession(buyer, init, platform);
}

export async function createMarketplaceCheckout(input: MarketplaceCheckoutInput) {
  const buyer = await requireAuth();
  return createMarketplaceCheckoutForBuyer(
    { id: buyer.id, email: buyer.email },
    input,
    "web"
  );
}

export async function listMyMarketplaceOrders(role: "buyer" | "seller" = "buyer") {
  const user = await requireAuth({ writeKind: "notification" });
  return listMyMarketplaceOrdersForUser(user.id, role);
}

export async function listMyMarketplaceOrdersForUser(
  userId: string,
  role: "buyer" | "seller" = "buyer"
) {
  return db.marketplaceOrder.findMany({
    where: role === "buyer" ? { buyerId: userId } : { sellerId: userId },
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
  /** Config carrier id preferred (e.g. KR_CJ) */
  carrierCode?: string;
  carrier?: string;
  trackingNumber: string;
  status?: "PREPARING" | "SHIPPED" | "IN_CUSTOMS" | "IN_TRANSIT" | "DELIVERED";
  /** Optional proof photos (parcel / label / packing) */
  proofUrls?: string[];
  packingNote?: string;
}) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: input.orderId } });
  if (!order || order.sellerId !== user.id) return { error: "권한이 없습니다." };
  if (["CANCELLED", "REFUNDED", "CONFIRMED", "SETTLED"].includes(order.status)) {
    return { error: "이 주문은 배송 상태를 변경할 수 없습니다." };
  }
  if (order.status === "ADMIN_REVIEW" || order.status === "DISPUTED") {
    return { error: "관리자 검토·분쟁 중에는 배송 상태를 변경할 수 없습니다." };
  }

  const status = input.status ?? "SHIPPED";
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber && status !== "PREPARING") {
    return { error: "송장번호를 입력해 주세요." };
  }

  const carrierMeta = input.carrierCode ? getCarrierById(input.carrierCode) : undefined;
  const carrierLabel = carrierMeta?.label ?? input.carrier?.trim() ?? null;
  const carrierCode = carrierMeta?.id ?? input.carrierCode?.trim() ?? null;

  if ((status === "SHIPPED" || status === "IN_TRANSIT") && !carrierCode && !carrierLabel) {
    return { error: "배송사를 선택해 주세요." };
  }

  let externalTrackingId: string | undefined;
  if (trackingNumber && carrierCode) {
    const provider = getTrackingProvider();
    const registered = await provider.registerTracking({
      carrierId: carrierCode,
      trackingNumber,
      trackingSlug: carrierMeta?.trackingSlug,
    });
    if (!("error" in registered)) {
      externalTrackingId = registered.externalId;
    }
  }

  const proofUrls = (input.proofUrls ?? []).map((u) => u.trim()).filter(Boolean).slice(0, 8);

  await db.marketplaceShipment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      carrier: carrierLabel,
      carrierCode,
      trackingNumber: trackingNumber || null,
      externalTrackingId: externalTrackingId ?? null,
      proofUrls,
      packingNote: input.packingNote?.trim() || null,
      status,
      shippedAt: status === "SHIPPED" || status === "IN_TRANSIT" || status === "IN_CUSTOMS" ? new Date() : null,
      deliveredAt: status === "DELIVERED" ? new Date() : null,
    },
    update: {
      carrier: carrierLabel,
      carrierCode,
      trackingNumber: trackingNumber || null,
      externalTrackingId: externalTrackingId ?? undefined,
      ...(proofUrls.length ? { proofUrls } : {}),
      packingNote: input.packingNote?.trim() || undefined,
      status,
      shippedAt:
        status === "SHIPPED" || status === "IN_TRANSIT" || status === "IN_CUSTOMS" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });

  const patch: { status?: typeof order.status; autoConfirmAt?: Date } = {};
  if (status === "PREPARING") patch.status = "PREPARING";
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

  await logMarketplaceAudit({
    orderId: order.id,
    actorId: user.id,
    action: MarketplaceAuditActions.SHIPMENT_STATUS,
    detail: `${status} ${carrierLabel ?? ""} ${trackingNumber}`,
    metadata: { carrierCode, proofCount: proofUrls.length },
  });

  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title:
      status === "DELIVERED"
        ? "배송이 완료되었습니다"
        : status === "PREPARING"
          ? "상품을 준비 중입니다"
          : "상품이 발송되었습니다",
    body: carrierLabel ? `${carrierLabel} ${trackingNumber}` : trackingNumber,
    link: `/market/orders/${order.id}`,
    actorId: user.id,
  });

  revalidatePath(`/market/orders/${order.id}`);
  revalidatePath("/market/orders");
  return { success: true };
}

/** 판매자: 결제완료 → 준비중 → 발송 → 배송완료 */
export async function sellerSetOrderStatus(
  orderId: string,
  status: "PREPARING" | "SHIPPED" | "DELIVERED"
) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { shipment: true },
  });
  if (!order || order.sellerId !== user.id) return { error: "권한이 없습니다." };

  const allowedFrom: Record<string, string[]> = {
    PREPARING: ["PAID", "PREPARING"],
    SHIPPED: ["PAID", "PREPARING", "SHIPPED"],
    DELIVERED: ["SHIPPED", "DELIVERED", "PREPARING"],
  };
  if (!allowedFrom[status]?.includes(order.status)) {
    return { error: "현재 상태에서는 변경할 수 없습니다." };
  }

  const data: {
    status: typeof status;
    autoConfirmAt?: Date;
  } = { status };

  if (status === "DELIVERED") {
    data.autoConfirmAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  await db.marketplaceOrder.update({ where: { id: orderId }, data });

  const shipStatus =
    status === "PREPARING"
      ? "PREPARING"
      : status === "SHIPPED"
        ? "SHIPPED"
        : "DELIVERED";

  await db.marketplaceShipment.upsert({
    where: { orderId },
    create: {
      orderId,
      status: shipStatus,
      shippedAt: status === "SHIPPED" || status === "DELIVERED" ? new Date() : null,
      deliveredAt: status === "DELIVERED" ? new Date() : null,
      carrier: order.shipment?.carrier,
      carrierCode: order.shipment?.carrierCode,
      trackingNumber: order.shipment?.trackingNumber,
    },
    update: {
      status: shipStatus,
      shippedAt: status === "SHIPPED" || status === "DELIVERED" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });

  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title: "주문 상태가 변경되었습니다",
    body: status,
    link: `/market/orders/${orderId}`,
    actorId: user.id,
  });

  revalidatePath(`/market/orders/${orderId}`);
  return { success: true };
}

export async function confirmMarketplaceOrder(orderId: string) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id) return { error: "권한이 없습니다." };
  if (order.status === "DISPUTED" || order.status === "ADMIN_REVIEW") {
    return { error: "분쟁·검토 중에는 구매 확정할 수 없습니다." };
  }
  if (order.status !== "DELIVERED" && order.status !== "SHIPPED") {
    return { error: "확정할 수 있는 상태가 아닙니다." };
  }

  await confirmAndMaybeSettle(orderId, { actorId: user.id });

  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "구매가 확정되었습니다",
    body: "에스크로 정책에 따라 정산이 진행됩니다.",
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
    data: { status: "REFUNDED", settlementStatus: "REVERSED", escrowHeld: false },
  });

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: refund.order.sellerId },
    data: { refundedOrderCount: { increment: 1 } },
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

export async function openMarketplaceDispute(
  orderId: string,
  reason: string,
  reasonCode?: MarketplaceDisputeReason,
  evidenceUrls?: string[]
) {
  const user = await requireAuth();
  const order = await db.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order || (order.buyerId !== user.id && order.sellerId !== user.id)) {
    return { error: "권한이 없습니다." };
  }
  if (["SETTLED", "REFUNDED", "CANCELLED", "AWAITING_PAYMENT"].includes(order.status)) {
    return { error: "이 주문에는 분쟁을 제기할 수 없습니다." };
  }
  const text = reason.trim();
  if (!text) return { error: "분쟁 사유를 입력해 주세요." };

  const code = reasonCode ?? "OTHER";
  const evidence = {
    urls: (evidenceUrls ?? []).slice(0, 8),
    note: text,
    submittedAt: new Date().toISOString(),
  };

  const isBuyer = order.buyerId === user.id;

  await db.marketplaceDispute.create({
    data: {
      orderId,
      openerId: user.id,
      reason: text,
      reasonCode: code,
      status: "OPEN",
      buyerEvidence: isBuyer ? evidence : undefined,
      sellerEvidence: !isBuyer ? evidence : undefined,
      evidence,
    },
  });
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "DISPUTED" },
  });
  await holdSettlementForDispute(orderId, user.id);

  await db.marketplaceSellerProfile.updateMany({
    where: { userId: order.sellerId },
    data: { disputedOrderCount: { increment: 1 } },
  });

  await logMarketplaceAudit({
    orderId,
    actorId: user.id,
    action: MarketplaceAuditActions.DISPUTE_OPEN,
    detail: `${code}: ${text.slice(0, 200)}`,
  });

  const otherId = isBuyer ? order.sellerId : order.buyerId;
  await createNotification({
    userId: otherId,
    type: "SYSTEM",
    title: "분쟁이 접수되었습니다 — 정산이 보류됩니다",
    body: text.slice(0, 120),
    link: `/market/orders/${orderId}`,
    actorId: user.id,
  });

  revalidatePath(`/market/orders/${orderId}`);
  revalidatePath("/admin/market");
  return { success: true };
}

export async function submitMarketplaceDisputeEvidence(
  disputeId: string,
  evidenceUrls: string[],
  note?: string
) {
  const user = await requireAuth();
  const dispute = await db.marketplaceDispute.findUnique({
    where: { id: disputeId },
    include: { order: true },
  });
  if (!dispute) return { error: "분쟁을 찾을 수 없습니다." };
  const order = dispute.order;
  if (order.buyerId !== user.id && order.sellerId !== user.id) {
    return { error: "권한이 없습니다." };
  }

  const payload = {
    urls: evidenceUrls.map((u) => u.trim()).filter(Boolean).slice(0, 8),
    note: note?.trim() || null,
    submittedAt: new Date().toISOString(),
  };

  const isBuyer = order.buyerId === user.id;
  await db.marketplaceDispute.update({
    where: { id: disputeId },
    data: {
      status: "EVIDENCE",
      ...(isBuyer ? { buyerEvidence: payload } : { sellerEvidence: payload }),
    },
  });

  await logMarketplaceAudit({
    orderId: order.id,
    actorId: user.id,
    action: MarketplaceAuditActions.DISPUTE_EVIDENCE,
    detail: isBuyer ? "buyer" : "seller",
    metadata: payload,
  });

  revalidatePath(`/market/orders/${order.id}`);
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
