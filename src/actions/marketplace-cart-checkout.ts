"use server";

import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getRequestCountryFromHeaders } from "@/lib/compliance/request-country";
import {
  computeFeesForCheckoutMode,
  resolveCheckoutRouting,
} from "@/lib/marketplace/payment-routing";
import {
  listingShipsToCountry,
  normalizeShipCountry,
  UNSUPPORTED_ADDRESS_COUNTRY_MESSAGE,
  UNSUPPORTED_SHIP_COUNTRY_MESSAGE,
} from "@/lib/marketplace/shipping-config";
import { assertOfacPaymentRequestAllowed } from "@/lib/compliance/ofac-payment-guard-server";
import { isOfacSanctionedCountry, OFAC_REGION_UNAVAILABLE_MESSAGE } from "@/lib/compliance/ofac-sanctioned-countries";
import type { MarketplaceCheckoutInput } from "@/actions/marketplace-checkout";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { buildStripeConnectSplitParams } from "@/lib/marketplace/stripe-connect-split";
import {
  getOrCreateStripeCustomer,
  listSavedPaymentMethods,
} from "@/lib/stripe-payment-methods";

export type MarketplaceCartLine = {
  listingId: string;
  quantity: number;
};

export type MarketplaceCartCheckoutInput = Omit<MarketplaceCheckoutInput, "listingId"> & {
  listingId?: string;
  items: MarketplaceCartLine[];
};

export async function groupMarketplaceCartLines(items: MarketplaceCartLine[]) {
  if (!items.length) return { error: "장바구니가 비어 있습니다." as const };

  const listings = await db.marketplaceListing.findMany({
    where: { id: { in: items.map((i) => i.listingId) } },
    select: {
      id: true,
      title: true,
      sellerId: true,
      status: true,
      priceAmount: true,
      currency: true,
      stock: true,
      type: true,
      shippingFeeType: true,
      shippingFeeFixed: true,
      shipToCountries: true,
      shipsWorldwide: true,
      sellerProfile: { select: { displayName: true } },
    },
  });

  const byId = new Map(listings.map((l) => [l.id, l]));
  const groups = new Map<
    string,
    {
      sellerId: string;
      sellerDisplayName: string;
      lines: { listing: (typeof listings)[0]; quantity: number }[];
      subtotal: number;
      shippingAmount: number;
    }
  >();

  for (const line of items) {
    const listing = byId.get(line.listingId);
    if (!listing || listing.status !== "ACTIVE") {
      return { error: "판매 중이지 않은 상품이 포함되어 있습니다." as const };
    }
    const qty = Math.max(1, line.quantity);
    if (listing.type !== "DIGITAL" && listing.stock < qty) {
      return { error: `"${listing.title}" 재고가 부족합니다.` as const };
    }
    const group = groups.get(listing.sellerId) ?? {
      sellerId: listing.sellerId,
      sellerDisplayName: listing.sellerProfile?.displayName ?? "판매자",
      lines: [],
      subtotal: 0,
      shippingAmount: 0,
    };
    group.lines.push({ listing, quantity: qty });
    group.subtotal += listing.priceAmount * qty;
    const ship =
      listing.type === "DIGITAL" || listing.shippingFeeType === "FREE"
        ? 0
        : listing.shippingFeeFixed;
    group.shippingAmount = Math.max(group.shippingAmount, ship);
    groups.set(listing.sellerId, group);
  }

  return { groups: [...groups.values()] };
}

async function initMultiItemStripeCartOrder(
  buyer: { id: string; email?: string | null; countryCode?: string | null },
  input: MarketplaceCartCheckoutInput,
  sellerId: string
) {
  const grouped = await groupMarketplaceCartLines(input.items);
  if ("error" in grouped) return grouped;
  const group = grouped.groups.find((g) => g.sellerId === sellerId);
  if (!group) return { error: "판매자 그룹을 찾을 수 없습니다." };

  const hdrs = await headers();
  const routing = resolveCheckoutRouting({
    userCountryCode: buyer.countryCode,
    shipCountry: input.shipCountry,
    geoCountry: getRequestCountryFromHeaders(hdrs),
  });
  if (routing.mode === "BLOCKED") {
    return { error: routing.blockedReason ?? "마켓플레이스는 Stripe 지원 국가에서만 이용할 수 있습니다." };
  }

  const ofacBlock = await assertOfacPaymentRequestAllowed(buyer.id, {
    shipCountry: input.shipCountry,
  });
  if (ofacBlock) return ofacBlock;

  const needsShipping = group.lines.some((l) => l.listing.type !== "DIGITAL");
  if (needsShipping) {
    if (!input.shipName?.trim() || !input.shipCountry?.trim() || !input.shipAddress1?.trim()) {
      return { error: "배송지(이름·국가·주소)를 입력해 주세요." };
    }
    const dest = normalizeShipCountry(input.shipCountry);
    if (!dest) return { error: UNSUPPORTED_ADDRESS_COUNTRY_MESSAGE };
    if (isOfacSanctionedCountry(dest)) return { error: OFAC_REGION_UNAVAILABLE_MESSAGE };
    for (const { listing } of group.lines) {
      if (listing.type === "DIGITAL") continue;
      if (!listingShipsToCountry(listing.shipToCountries, listing.shipsWorldwide, dest)) {
        return { error: `"${listing.title}": ${UNSUPPORTED_SHIP_COUNTRY_MESSAGE}` };
      }
    }
  }

  const seller = await db.user.findUnique({
    where: { id: sellerId },
    select: { stripeConnectAccountId: true },
  });
  if (!seller?.stripeConnectAccountId) {
    return { error: "판매자 Stripe Connect 온보딩이 완료되지 않았습니다." };
  }

  const fees = computeFeesForCheckoutMode("STRIPE", group.subtotal, group.shippingAmount);
  const currency = group.lines[0]?.listing.currency || "usd";

  const shippingFields = {
    shipName: input.shipName?.trim() || null,
    shipCountry: needsShipping ? normalizeShipCountry(input.shipCountry) : null,
    shipPostal: input.shipPostal?.trim() || null,
    shipAddress1: input.shipAddress1?.trim() || null,
    shipAddress2: input.shipAddress2?.trim() || null,
    shipPhone: input.shipPhone?.trim() || null,
    buyerNote: input.buyerNote?.trim() || null,
  };

  const order = await db.marketplaceOrder.create({
    data: {
      buyerId: buyer.id,
      sellerId,
      sellerProfileId: (
        await db.marketplaceSellerProfile.findUnique({
          where: { userId: sellerId },
          select: { id: true },
        })
      )?.id,
      status: "AWAITING_PAYMENT",
      checkoutMode: "STRIPE",
      buyerCountryCode: routing.buyerCountry.countryCode,
      subtotalAmount: group.subtotal,
      shippingAmount: group.shippingAmount,
      platformFeeAmount: fees.platformFeeAmount,
      sellerEarnAmount: fees.sellerEarnAmount,
      currency,
      ...shippingFields,
      items: {
        create: group.lines.map(({ listing, quantity }) => ({
          listingId: listing.id,
          titleSnapshot: listing.title,
          unitPrice: listing.priceAmount,
          quantity,
          listingType: listing.type,
        })),
      },
    },
  });

  const paymentIntent = await db.paymentIntent.create({
    data: {
      userId: buyer.id,
      type: "MARKETPLACE",
      amount: fees.totalAmount,
      paymentRail: "STRIPE",
      metadata: {
        marketplaceOrderId: order.id,
        sellerId,
        cartCheckout: true,
        listingIds: group.lines.map((l) => l.listing.id),
      },
    },
  });

  if (!isStripeConfigured()) {
    await db.marketplaceOrder.delete({ where: { id: order.id } });
    return { error: "Stripe 결제가 설정되지 않았습니다." };
  }

  const customerId = await getOrCreateStripeCustomer(buyer.id, buyer.email);
  const stripe = getStripe();
  const connectSplit = buildStripeConnectSplitParams({
    checkoutMode: "STRIPE",
    sellerConnectAccountId: seller.stripeConnectAccountId,
    platformFeeAmount: fees.platformFeeAmount,
    totalAmount: fees.totalAmount,
    transferGroup: order.id,
  });

  const pi = await stripe.paymentIntents.create({
    amount: fees.totalAmount,
    currency: currency.toLowerCase(),
    customer: customerId,
    description: `${group.sellerDisplayName} · ${group.lines.length}건`.slice(0, 200),
    metadata: {
      orderId: paymentIntent.id,
      type: "MARKETPLACE",
      userId: buyer.id,
      marketplaceOrderId: order.id,
      sellerId,
      cartCheckout: "true",
    },
    automatic_payment_methods: { enabled: true },
    ...connectSplit,
  });

  await db.paymentIntent.update({
    where: { id: paymentIntent.id },
    data: { paymentKey: pi.id },
  });

  const methods = await listSavedPaymentMethods(buyer.id);
  const { getMocoCheckoutQuote } = await import("@/lib/moco-checkout-service");
  const mocoQuote = await getMocoCheckoutQuote(buyer.id, fees.totalAmount);

  return {
    orderId: paymentIntent.id,
    marketplaceOrderId: order.id,
    clientSecret: pi.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    methods,
    amount: fees.totalAmount,
    orderName: `${group.sellerDisplayName} 외 ${group.lines.length}건`,
    mocoBalance: mocoQuote.mocoBalance,
    mocoRequired: mocoQuote.mocoRequired,
    canPayWithMoco: mocoQuote.canPayWithMoco,
  };
}

/** 장바구니 — 판매자별 결제 (동일 판매자 다품목 1주문) */
export async function checkoutMarketplaceCartForSeller(
  sellerId: string,
  input: MarketplaceCartCheckoutInput
) {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { countryCode: true },
  });

  const hdrs = await headers();
  const routing = resolveCheckoutRouting({
    userCountryCode: dbUser?.countryCode,
    shipCountry: input.shipCountry,
    geoCountry: getRequestCountryFromHeaders(hdrs),
  });

  if (routing.mode === "BLOCKED") {
    return {
      error: routing.blockedReason ?? "마켓플레이스는 Stripe 지원 국가에서만 이용할 수 있습니다.",
      checkoutMode: "BLOCKED" as const,
    };
  }

  return initMultiItemStripeCartOrder(
    { id: user.id, email: user.email, countryCode: dbUser?.countryCode },
    input,
    sellerId
  );
}

export async function getMarketplaceCartCheckoutSummary(items: MarketplaceCartLine[]) {
  const user = await requireAuth({ writeKind: "notification" }).catch(() => null);
  const grouped = await groupMarketplaceCartLines(items);
  if ("error" in grouped) return { error: grouped.error };

  const hdrs = await headers();
  const dbUser = user
    ? await db.user.findUnique({ where: { id: user.id }, select: { countryCode: true } })
    : null;

  const routing = resolveCheckoutRouting({
    userCountryCode: dbUser?.countryCode,
    geoCountry: getRequestCountryFromHeaders(hdrs),
  });

  return {
    checkoutMode: routing.mode,
    disclaimer: routing.disclaimer,
    blocked: routing.mode === "BLOCKED",
    groups: grouped.groups.map((g) => ({
      sellerId: g.sellerId,
      sellerDisplayName: g.sellerDisplayName,
      itemCount: g.lines.length,
      subtotal: g.subtotal,
      shippingAmount: g.shippingAmount,
      total: g.subtotal + g.shippingAmount,
      lines: g.lines.map(({ listing, quantity }) => ({
        listingId: listing.id,
        title: listing.title,
        quantity,
        unitPrice: listing.priceAmount,
      })),
    })),
  };
}
