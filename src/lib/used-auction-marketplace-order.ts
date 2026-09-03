/**
 * Used auction win → MarketplaceOrder + Star Market fulfillment/capture pipeline.
 */

import { db } from "@/lib/db";
import { computeMarketplaceFees } from "@/lib/marketplace/constants";
import { fulfillMarketplaceOrder } from "@/lib/marketplace/fulfillment";
import { isMarketplacePaymentAuthorized, retrieveMarketplacePaymentIntent } from "@/lib/marketplace/stripe-payment";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { normalizeUsedCurrency } from "@/lib/used-market";
import {
  resolveBidHoldMode,
  voidUsedAuctionBidHold,
} from "@/lib/used-auction-bid-hold";
import { safeLogWarn } from "@/lib/safe-log";

export type ActivateUsedAuctionOrderResult =
  | { ok: true; orderId: string; stripe: true }
  | { skipped: true; reason: "honor" | "none" | "no_hold" | "already_active" }
  | { error: string };

async function findWinnerStripeBid(listingId: string, winnerId: string) {
  return db.usedAuctionBid.findFirst({
    where: {
      listingId,
      bidderId: winnerId,
      stripePaymentIntentId: { not: null },
      paymentIntentDbId: { not: null },
    },
    orderBy: { amount: "desc" },
    select: {
      id: true,
      amount: true,
      paymentIntentDbId: true,
      stripePaymentIntentId: true,
      holdAmount: true,
      termsAcceptedAt: true,
    },
  });
}

/** Create MarketplaceOrder from winning bid hold and activate fulfillment (auth → PREPARING). */
export async function activateUsedAuctionStripeOrder(
  listingId: string,
  winnerId: string
): Promise<ActivateUsedAuctionOrderResult> {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      sellerId: true,
      currency: true,
      depositEnabled: true,
      saleType: true,
      marketplaceOrderId: true,
      auctionState: true,
      status: true,
    },
  });
  if (!listing || listing.saleType !== "AUCTION") {
    return { error: "경매 상품이 아닙니다." };
  }
  if (listing.marketplaceOrderId) {
    return { skipped: true, reason: "already_active" };
  }

  const holdMode = await resolveBidHoldMode({ listing });
  if (holdMode !== "stripe") {
    return { skipped: true, reason: holdMode === "none" ? "none" : "honor" };
  }

  const bid = await findWinnerStripeBid(listingId, winnerId);
  if (!bid?.paymentIntentDbId || !bid.stripePaymentIntentId) {
    return { skipped: true, reason: "no_hold" };
  }

  if (!isStripeConfigured()) {
    return { error: "Stripe가 설정되지 않았습니다." };
  }

  const pi = await retrieveMarketplacePaymentIntent(bid.stripePaymentIntentId);
  if (!pi || !isMarketplacePaymentAuthorized(pi)) {
    return { error: "낙찰자 카드 hold가 유효하지 않습니다. 재승인이 필요합니다." };
  }

  const winAmount = bid.amount;
  const shippingAmount = 0;
  const { platformFeeAmount, sellerEarnAmount, totalAmount } = computeMarketplaceFees(
    winAmount,
    shippingAmount
  );

  if (pi.amount !== totalAmount && pi.amount !== (bid.holdAmount ?? totalAmount)) {
    return { error: "Hold 금액과 낙찰가가 일치하지 않습니다." };
  }
  const payAmount = pi.amount;

  const sellerProfile = await db.marketplaceSellerProfile.findUnique({
    where: { userId: listing.sellerId },
    select: { id: true },
  });

  const buyer = await db.user.findUnique({
    where: { id: winnerId },
    select: { countryCode: true },
  });

  const order = await db.$transaction(async (tx) => {
    const created = await tx.marketplaceOrder.create({
      data: {
        buyerId: winnerId,
        sellerId: listing.sellerId,
        sellerProfileId: sellerProfile?.id ?? null,
        status: "AWAITING_PAYMENT",
        subtotalAmount: winAmount,
        shippingAmount,
        platformFeeAmount,
        sellerEarnAmount,
        currency: "usd",
        checkoutMode: "STRIPE",
        buyerCountryCode: buyer?.countryCode ?? null,
        escrowHeld: true,
        usedListingId: listingId,
        purchaseTermsAcceptedAt: bid.termsAcceptedAt ?? new Date(),
        items: {
          create: {
            usedListingId: listingId,
            titleSnapshot: listing.title.slice(0, 500),
            unitPrice: winAmount,
            quantity: 1,
            listingType: "PHYSICAL",
          },
        },
      },
      select: { id: true },
    });

    await tx.usedListing.update({
      where: { id: listingId },
      data: {
        marketplaceOrderId: created.id,
        winningBidderId: winnerId,
        auctionState: "PAYMENT_COMPLETED",
        status: "RESERVED",
        paymentCompletedAt: new Date(),
        paymentDueAt: null,
      },
    });

    await tx.usedAuctionBid.updateMany({
      where: { listingId, bidderId: winnerId },
      data: { bidStatus: "WINNER" },
    });

    await tx.paymentIntent.update({
      where: { id: bid.paymentIntentDbId! },
      data: {
        type: "MARKETPLACE",
        metadata: {
          marketplaceOrderId: created.id,
          usedListingId: listingId,
          sellerId: listing.sellerId,
          source: "used_auction",
          bidAmount: winAmount,
        },
      },
    });

    return created;
  });

  try {
    const stripe = getStripe();
    await stripe.paymentIntents.update(bid.stripePaymentIntentId, {
      metadata: {
        orderId: bid.paymentIntentDbId!,
        type: "MARKETPLACE",
        marketplaceOrderId: order.id,
        usedListingId: listingId,
        userId: winnerId,
        sellerId: listing.sellerId,
        source: "used_auction",
      },
      transfer_group: order.id,
    });
  } catch (e) {
    safeLogWarn("used-auction-order-pi-meta", { err: String(e) });
  }

  const fulfilled = await fulfillMarketplaceOrder({
    marketplaceOrderId: order.id,
    paymentIntentDbId: bid.paymentIntentDbId,
    paymentRef: bid.stripePaymentIntentId,
    amount: payAmount,
  });

  if ("error" in fulfilled && fulfilled.error) {
    await db.marketplaceOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await db.usedListing.update({
      where: { id: listingId },
      data: {
        marketplaceOrderId: null,
        auctionState: "ENDED",
        status: "SELLING",
        paymentCompletedAt: null,
      },
    });
    await voidUsedAuctionBidHold({
      paymentIntentDbId: bid.paymentIntentDbId,
      stripePaymentIntentId: bid.stripePaymentIntentId,
      reason: "fulfillment_failed",
    });
    return { error: fulfilled.error };
  }

  return { ok: true, orderId: order.id, stripe: true };
}

export async function isUsedAuctionStripeListing(listingId: string) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { depositEnabled: true, currency: true, sellerId: true },
  });
  if (!listing) return false;
  return (await resolveBidHoldMode({ listing })) === "stripe";
}

export async function getUsedListingMarketplaceOrderId(listingId: string) {
  const row = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { marketplaceOrderId: true },
  });
  return row?.marketplaceOrderId ?? null;
}

/** Capture/settlement failed — void hold and promote next bidder. */
export async function handleUsedAuctionOrderCaptureFailure(orderId: string, reason: string) {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    select: { usedListingId: true, buyerId: true, stripePaymentIntentId: true },
  });
  if (!order?.usedListingId) return { handled: false as const };

  const listingId = order.usedListingId;
  const failedWinnerId = order.buyerId;

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelledAt: new Date(), escrowHeld: false },
  });

  await voidUsedAuctionBidHold({
    stripePaymentIntentId: order.stripePaymentIntentId,
    reason,
  });

  await db.usedAuctionBid.updateMany({
    where: { listingId, bidderId: failedWinnerId },
    data: { bidStatus: "FORFEITED" },
  });

  await db.usedListing.update({
    where: { id: listingId },
    data: {
      marketplaceOrderId: null,
      winningBidderId: null,
      paymentCompletedAt: null,
      auctionState: "PAYMENT_TIMEOUT",
    },
  });

  const { promoteNextAuctionWinner } = await import("@/lib/used-auction-lifecycle");
  const transfer = await promoteNextAuctionWinner(listingId, undefined, {
    incrementForfeitCount: true,
  });
  return { handled: true as const, transfer };
}

export function usedOrderLink(orderId: string) {
  return `/market/orders/${orderId}`;
}

/** Saved-card off-session hold for next-bidder auto-win. */
export async function attemptAutoHoldAndActivateOrder(
  listingId: string,
  bidderId: string,
  bidAmount: number
): Promise<
  | { ok: true; orderId: string }
  | { requiresAction: true; paymentIntentDbId: string; clientSecret: string }
  | { error: string; code?: "no_card" | "hold_failed" }
> {
  const { prepareUsedAuctionBidHold, payUsedAuctionBidHoldWithSavedCard } = await import(
    "@/lib/used-auction-bid-hold"
  );
  const { listSavedPaymentMethods } = await import("@/lib/stripe-payment-methods");

  const prepared = await prepareUsedAuctionBidHold({
    userId: bidderId,
    listingId,
    bidAmount,
  });
  if ("error" in prepared) {
    return { error: prepared.error, code: "hold_failed" };
  }

  const methods = await listSavedPaymentMethods(bidderId);
  const pm = methods.find((m) => m.isDefault) ?? methods[0];
  if (!pm) {
    return { error: "등록된 카드가 없습니다.", code: "no_card" };
  }

  const paid = await payUsedAuctionBidHoldWithSavedCard(bidderId, prepared.orderId, pm.id);
  if ("requiresAction" in paid && paid.requiresAction && paid.clientSecret) {
    return {
      requiresAction: true,
      paymentIntentDbId: prepared.orderId,
      clientSecret: paid.clientSecret,
    };
  }
  if ("error" in paid) {
    return { error: paid.error, code: "hold_failed" };
  }
  if (!("ok" in paid)) {
    return { error: "입찰 hold에 실패했습니다.", code: "hold_failed" };
  }

  await db.usedAuctionBid.updateMany({
    where: { listingId, bidderId, amount: bidAmount },
    data: {
      paymentIntentDbId: prepared.orderId,
      stripePaymentIntentId: paid.stripePaymentIntentId,
      holdAmount: paid.holdAmount,
      holdExpiresAt: paid.holdExpiresAt,
      bidStatus: "ACTIVE",
    },
  });

  const activated = await activateUsedAuctionStripeOrder(listingId, bidderId);
  if ("error" in activated) return { error: activated.error, code: "hold_failed" };
  if ("skipped" in activated) return { error: "주문 활성화를 건너뛰었습니다.", code: "hold_failed" };
  return { ok: true, orderId: activated.orderId };
}

/** Stripe path: void non-winners, create MarketplaceOrder or honor fallback. */
export async function finalizeUsedAuctionWinner(input: {
  listingId: string;
  winnerId: string;
  amount: number;
  title: string;
  currency: string;
  paymentDeadlineHours: number;
}) {
  const { onAuctionEndedVoidHolds } = await import("@/lib/used-auction-bid-hold");
  const { beginAuctionPaymentWindow, setupWinnerTradeChat } = await import(
    "@/lib/used-auction-lifecycle"
  );
  const { formatUsedPrice } = await import("@/lib/used-market");
  const { sendUsedAuctionNotification } = await import("@/lib/used-auction-notify");
  const { getUsedAuctionConfig } = await import("@/lib/used-auction-lifecycle");

  await onAuctionEndedVoidHolds(input.listingId, input.winnerId);

  const activated = await activateUsedAuctionStripeOrder(input.listingId, input.winnerId);
  if ("ok" in activated && activated.ok) {
    const orderLink = usedOrderLink(activated.orderId);
    await setupWinnerTradeChat(input.listingId, input.winnerId, [
      "🎉 경매 낙찰 — 결제 승인 완료",
      "",
      "배송은 주문 페이지에서 추적 번호를 등록해 주세요.",
      `주문: ${orderLink}`,
    ]).catch(() => {});
    await sendUsedAuctionNotification({
      userId: input.winnerId,
      type: "won",
      title: "경매 낙찰 — 주문 생성됨",
      body: `${input.title} · ${formatUsedPrice(input.amount, input.currency)}`,
      link: orderLink,
    });
    const sellerRow = await db.usedListing.findUnique({
      where: { id: input.listingId },
      select: { sellerId: true },
    });
    if (sellerRow) {
      await sendUsedAuctionNotification({
        userId: sellerRow.sellerId,
        type: "ended",
        title: "경매 낙찰 — 배송 준비",
        body: `${input.title} · ${formatUsedPrice(input.amount, input.currency)}`,
        link: orderLink,
      });
    }
    return { stripe: true as const, orderId: activated.orderId };
  }

  const config = await getUsedAuctionConfig();
  await beginAuctionPaymentWindow(input.listingId, input.winnerId, config);
  await setupWinnerTradeChat(input.listingId, input.winnerId, [
    "🎉 경매 낙찰 안내",
    "",
    `결제는 ${config.paymentDeadlineHours}시간 이내에 완료해 주세요.`,
    "기한 내 미결제 시 중고거래 이용이 제한됩니다.",
  ]).catch(() => {});

  const link = `/used/${input.listingId}`;
  await sendUsedAuctionNotification({
    userId: input.winnerId,
    type: "won",
    title: "경매 낙찰 — 결제 필요",
    body: `${input.title} · ${formatUsedPrice(input.amount, input.currency)} · ${config.paymentDeadlineHours}시간 이내 결제`,
    link,
  });

  const listing = await db.usedListing.findUnique({
    where: { id: input.listingId },
    select: { sellerId: true },
  });
  if (listing) {
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "ended",
      title: "경매 낙찰 완료",
      body: `${input.title} · ${formatUsedPrice(input.amount, input.currency)}`,
      link,
    });
  }

  return {
    stripe: false as const,
    error: "error" in activated ? activated.error : undefined,
  };
}
