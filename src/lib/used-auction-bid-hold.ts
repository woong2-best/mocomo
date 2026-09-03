/**
 * Used auction bid Stripe auth holds — manual capture + Connect destination.
 * Hold = full bid amount (USD). Void on outbid / 유찰. Re-auth before 7-day expiry.
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { isStripeConnectPayoutReady } from "@/lib/stripe-connect";
import { buildStripeConnectSplitParams } from "@/lib/marketplace/stripe-connect-split";
import { computeMarketplaceFees } from "@/lib/marketplace/constants";
import { getOrCreateStripeCustomer, listSavedPaymentMethods } from "@/lib/stripe-payment-methods";
import { stripePaymentIntentReturnUrl } from "@/lib/stripe-payment-return-url";
import { isMarketplacePaymentAuthorized } from "@/lib/marketplace/stripe-payment";
import { getUsedAuctionConfig } from "@/lib/used-auction-lifecycle";
import type { UsedAuctionConfigSlice } from "@/lib/used-auction-config";
import {
  USED_AUCTION_HOLD_AUTH_DAYS,
  USED_AUCTION_MIN_BID_HOLD_USD_CENTS,
  USED_AUCTION_MIN_CAPTURABLE_USD_CENTS,
  USED_AUCTION_REAUTH_LEAD_HOURS,
} from "@/lib/used-auction-config";
import { normalizeUsedCurrency, type UsedCurrency } from "@/lib/used-market";
import { isOfacComprehensiveEmbargoLocation } from "@/lib/compliance/ofac-comprehensive-embargo";
import { safeLogWarn } from "@/lib/safe-log";

export type BidHoldMode = "none" | "stripe" | "honor";

export function computeBidHoldAmount(bidAmount: number, currency: UsedCurrency): number {
  if (currency !== "usd") return 0;
  return Math.max(Math.floor(bidAmount), USED_AUCTION_MIN_BID_HOLD_USD_CENTS);
}

export function validateBidHoldAmount(
  bidAmount: number,
  currency: UsedCurrency
): { error: string } | null {
  if (currency !== "usd") return null;
  if (bidAmount < USED_AUCTION_MIN_BID_HOLD_USD_CENTS) {
    return { error: "USD 입찰은 카드 hold를 위해 최소 $0.50 이상이어야 합니다." };
  }
  return null;
}

export function validateWinningBidCapturable(
  bidAmount: number,
  currency: UsedCurrency
): { error: string } | null {
  if (currency !== "usd") return null;
  if (bidAmount < USED_AUCTION_MIN_CAPTURABLE_USD_CENTS) {
    return {
      error: `USD 낙찰가는 Stripe 정산 최소 $${(USED_AUCTION_MIN_CAPTURABLE_USD_CENTS / 100).toFixed(2)} 이상이어야 합니다.`,
    };
  }
  return null;
}

export async function isListingBidHoldEnabled(
  listing: { depositEnabled: boolean },
  config?: UsedAuctionConfigSlice
): Promise<boolean> {
  const cfg = config ?? (await getUsedAuctionConfig());
  return listing.depositEnabled || cfg.depositEnabled;
}

export async function resolveBidHoldMode(input: {
  listing: {
    depositEnabled: boolean;
    currency: string;
    sellerId: string;
  };
  config?: UsedAuctionConfigSlice;
}): Promise<BidHoldMode> {
  const enabled = await isListingBidHoldEnabled(input.listing, input.config);
  if (!enabled) return "none";
  if (normalizeUsedCurrency(input.listing.currency) !== "usd") return "honor";
  if (!isStripeConfigured()) return "honor";

  const seller = await db.user.findUnique({
    where: { id: input.listing.sellerId },
    select: { stripeConnectAccountId: true },
  });
  const connectReady = await isStripeConnectPayoutReady(seller?.stripeConnectAccountId);
  if (!connectReady || !seller?.stripeConnectAccountId) return "honor";

  return "stripe";
}

function holdExpiresAtFromNow(now = Date.now()): Date {
  return new Date(now + USED_AUCTION_HOLD_AUTH_DAYS * 24 * 60 * 60 * 1000);
}

function bidHoldMetadata(input: {
  paymentIntentDbId: string;
  userId: string;
  listingId: string;
  bidAmount: number;
  sellerId: string;
}) {
  return {
    orderId: input.paymentIntentDbId,
    type: "USED_AUCTION_BID_HOLD",
    userId: input.userId,
    listingId: input.listingId,
    bidAmount: String(input.bidAmount),
    sellerId: input.sellerId,
  };
}

export async function confirmUsedAuctionBidHold(
  userId: string,
  listingId: string,
  paymentIntentDbId: string
): Promise<
  | { ok: true; stripePaymentIntentId: string; holdAmount: number; holdExpiresAt: Date }
  | { error: string }
> {
  const intent = await db.paymentIntent.findUnique({ where: { id: paymentIntentDbId } });
  if (!intent || intent.userId !== userId || intent.type !== "USED_AUCTION_BID_HOLD") {
    return { error: "입찰 hold 정보를 찾을 수 없습니다." };
  }
  const meta = intent.metadata as { listingId?: string; bidAmount?: number };
  if (meta.listingId !== listingId) {
    return { error: "경매 정보가 일치하지 않습니다." };
  }
  const bidAmount = Number(meta.bidAmount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { error: "입찰가 정보가 없습니다." };
  }
  return verifyUsedAuctionBidHold({
    userId,
    paymentIntentDbId,
    listingId,
    bidAmount,
  });
}

export async function payUsedAuctionBidHoldWithSavedCard(
  userId: string,
  paymentIntentDbId: string,
  paymentMethodId: string
): Promise<
  | { ok: true; stripePaymentIntentId: string; holdAmount: number; holdExpiresAt: Date }
  | { requiresAction: true; clientSecret: string; orderId: string }
  | { error: string }
> {
  if (!isStripeConfigured()) return { error: "결제가 설정되지 않았습니다." };

  const intent = await db.paymentIntent.findUnique({ where: { id: paymentIntentDbId } });
  if (!intent || intent.userId !== userId || intent.type !== "USED_AUCTION_BID_HOLD") {
    return { error: "입찰 hold 정보를 찾을 수 없습니다." };
  }
  if (intent.status === "PAID") {
    const meta = intent.metadata as { listingId?: string; bidAmount?: number };
    const confirmed = await confirmUsedAuctionBidHold(
      userId,
      meta.listingId ?? "",
      paymentIntentDbId
    );
    if ("error" in confirmed) return confirmed;
    return confirmed;
  }
  if (!intent.paymentKey) return { error: "결제를 먼저 준비해 주세요." };

  const methods = await listSavedPaymentMethods(userId);
  if (!methods.some((m) => m.id === paymentMethodId)) {
    return { error: "등록된 카드만 사용할 수 있습니다." };
  }

  const stripe = getStripe();
  try {
    const pi = await stripe.paymentIntents.confirm(intent.paymentKey, {
      payment_method: paymentMethodId,
      return_url: stripePaymentIntentReturnUrl(paymentIntentDbId),
    });

    if (pi.status === "requires_action" && pi.client_secret) {
      return {
        requiresAction: true,
        clientSecret: pi.client_secret,
        orderId: paymentIntentDbId,
      };
    }

    if (!isMarketplacePaymentAuthorized(pi)) {
      return { error: "카드 승인(hold)이 완료되지 않았습니다." };
    }

    const meta = intent.metadata as { listingId?: string; bidAmount?: number };
    const listingId = meta.listingId ?? "";
    return confirmUsedAuctionBidHold(userId, listingId, paymentIntentDbId);
  } catch (err: unknown) {
    const stripeErr = err as { code?: string; message?: string; payment_intent?: Stripe.PaymentIntent };
    if (
      stripeErr.code === "authentication_required" &&
      stripeErr.payment_intent?.client_secret
    ) {
      return {
        requiresAction: true,
        clientSecret: stripeErr.payment_intent.client_secret,
        orderId: paymentIntentDbId,
      };
    }
    return { error: stripeErr.message ?? "카드 승인에 실패했습니다." };
  }
}

export async function prepareUsedAuctionBidHoldWithMethods(input: {
  userId: string;
  email?: string | null;
  listingId: string;
  bidAmount: number;
}) {
  const prepared = await prepareUsedAuctionBidHold(input);
  if ("error" in prepared) return prepared;
  const methods = await listSavedPaymentMethods(input.userId);
  return { ...prepared, methods };
}

export async function prepareUsedAuctionBidHold(input: {
  userId: string;
  email?: string | null;
  listingId: string;
  bidAmount: number;
}): Promise<
  | {
      orderId: string;
      clientSecret: string;
      publishableKey: string;
      holdAmount: number;
      bidAmount: number;
      mode: "stripe";
    }
  | { error: string; mode?: BidHoldMode }
> {
  const bidAmount = Math.floor(input.bidAmount);
  const listing = await db.usedListing.findUnique({
    where: { id: input.listingId },
    select: {
      id: true,
      sellerId: true,
      currency: true,
      depositEnabled: true,
      saleType: true,
    },
  });
  if (!listing || listing.saleType !== "AUCTION") {
    return { error: "경매 상품이 아닙니다." };
  }

  const mode = await resolveBidHoldMode({ listing });
  if (mode === "none") return { error: "이 경매는 입찰 hold가 필요하지 않습니다.", mode };
  if (mode === "honor") {
    return { error: "Stripe 입찰 hold를 사용할 수 없습니다. 일반 입찰을 이용해 주세요.", mode };
  }

  const currency = normalizeUsedCurrency(listing.currency);
  const holdCheck = validateBidHoldAmount(bidAmount, currency);
  if (holdCheck) return { error: holdCheck.error, mode };

  const buyer = await db.user.findUnique({
    where: { id: input.userId },
    select: { countryCode: true },
  });
  if (isOfacComprehensiveEmbargoLocation({ countryCode: buyer?.countryCode })) {
    return { error: "Service is unavailable in your region.", mode };
  }

  const seller = await db.user.findUnique({
    where: { id: listing.sellerId },
    select: { stripeConnectAccountId: true },
  });
  if (!seller?.stripeConnectAccountId) {
    return { error: "판매자 Stripe Connect 설정이 완료되지 않았습니다.", mode: "honor" };
  }

  const holdAmount = computeBidHoldAmount(bidAmount, currency);
  const { platformFeeAmount } = computeMarketplaceFees(holdAmount, 0);

  const intent = await db.paymentIntent.create({
    data: {
      userId: input.userId,
      type: "USED_AUCTION_BID_HOLD",
      amount: holdAmount,
      paymentRail: "STRIPE",
      metadata: {
        listingId: input.listingId,
        bidAmount,
        sellerId: listing.sellerId,
        holdOnly: true,
      },
    },
  });

  const customerId = await getOrCreateStripeCustomer(input.userId, input.email);
  const stripe = getStripe();
  const connectSplit = buildStripeConnectSplitParams({
    checkoutMode: "STRIPE",
    sellerConnectAccountId: seller.stripeConnectAccountId,
    platformFeeAmount,
    totalAmount: holdAmount,
    transferGroup: `used-auction-${input.listingId}`,
  });

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.create({
      amount: holdAmount,
      currency: "usd",
      customer: customerId,
      description: `Auction bid hold #${input.listingId.slice(0, 8)}`,
      metadata: bidHoldMetadata({
        paymentIntentDbId: intent.id,
        userId: input.userId,
        listingId: input.listingId,
        bidAmount,
        sellerId: listing.sellerId,
      }),
      automatic_payment_methods: { enabled: true },
      ...connectSplit,
    });
  } catch (e) {
    await db.paymentIntent.delete({ where: { id: intent.id } }).catch(() => null);
    return { error: e instanceof Error ? e.message : "입찰 hold 준비 실패" };
  }

  await db.paymentIntent.update({
    where: { id: intent.id },
    data: { paymentKey: pi.id },
  });

  if (!pi.client_secret) return { error: "결제 준비에 실패했습니다." };

  return {
    orderId: intent.id,
    clientSecret: pi.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    holdAmount,
    bidAmount,
    mode: "stripe",
  };
}

export async function verifyUsedAuctionBidHold(input: {
  userId: string;
  paymentIntentDbId: string;
  listingId: string;
  bidAmount: number;
}): Promise<
  | { ok: true; stripePaymentIntentId: string; holdAmount: number; holdExpiresAt: Date }
  | { error: string }
> {
  const intent = await db.paymentIntent.findUnique({ where: { id: input.paymentIntentDbId } });
  if (!intent || intent.userId !== input.userId || intent.type !== "USED_AUCTION_BID_HOLD") {
    return { error: "입찰 hold 정보를 찾을 수 없습니다." };
  }
  if (intent.status === "PAID") {
    const existing = await db.usedAuctionBid.findFirst({
      where: { paymentIntentDbId: intent.id },
      select: { stripePaymentIntentId: true, holdAmount: true, holdExpiresAt: true },
    });
    if (existing?.stripePaymentIntentId && existing.holdExpiresAt) {
      return {
        ok: true,
        stripePaymentIntentId: existing.stripePaymentIntentId,
        holdAmount: existing.holdAmount ?? intent.amount,
        holdExpiresAt: existing.holdExpiresAt,
      };
    }
  }
  if (!intent.paymentKey) return { error: "Stripe 결제가 준비되지 않았습니다." };

  const meta = intent.metadata as { listingId?: string; bidAmount?: number };
  if (meta.listingId !== input.listingId) {
    return { error: "경매 정보가 일치하지 않습니다." };
  }
  if (Number(meta.bidAmount) !== Math.floor(input.bidAmount)) {
    return { error: "입찰가가 hold 금액과 일치하지 않습니다." };
  }

  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(intent.paymentKey);
  if (!isMarketplacePaymentAuthorized(pi)) {
    return { error: "카드 승인(hold)이 완료되지 않았습니다." };
  }
  if (pi.amount !== intent.amount) {
    return { error: "Hold 금액이 일치하지 않습니다." };
  }

  const holdExpiresAt = holdExpiresAtFromNow();
  await db.paymentIntent.update({
    where: { id: intent.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      purchaseTermsAcceptedAt: intent.purchaseTermsAcceptedAt ?? new Date(),
    },
  });

  return {
    ok: true,
    stripePaymentIntentId: pi.id,
    holdAmount: pi.amount,
    holdExpiresAt,
  };
}

export async function voidUsedAuctionBidHold(input: {
  paymentIntentDbId?: string | null;
  stripePaymentIntentId?: string | null;
  reason: string;
}): Promise<void> {
  if (!isStripeConfigured()) return;

  let paymentKey = input.stripePaymentIntentId ?? null;
  const dbId = input.paymentIntentDbId ?? null;

  if (!paymentKey && dbId) {
    const row = await db.paymentIntent.findUnique({
      where: { id: dbId },
      select: { paymentKey: true },
    });
    paymentKey = row?.paymentKey ?? null;
  }

  if (!paymentKey) return;

  const stripe = getStripe();
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentKey);
    if (pi.status === "requires_capture") {
      await stripe.paymentIntents.cancel(paymentKey);
    }
  } catch (e) {
    safeLogWarn("used-auction-hold-void", { paymentKey, reason: input.reason, err: String(e) });
  }

  if (dbId) {
    await db.paymentIntent.updateMany({
      where: { id: dbId },
      data: { status: "FAILED" },
    });
  }
}

export async function voidActiveHoldForBidder(listingId: string, bidderId: string, reason: string) {
  const bid = await db.usedAuctionBid.findFirst({
    where: {
      listingId,
      bidderId,
      bidStatus: { in: ["ACTIVE", "WINNER"] },
      stripePaymentIntentId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      paymentIntentDbId: true,
      stripePaymentIntentId: true,
    },
  });
  if (!bid) return;
  await voidUsedAuctionBidHold({
    paymentIntentDbId: bid.paymentIntentDbId,
    stripePaymentIntentId: bid.stripePaymentIntentId,
    reason,
  });
}

export async function voidAllListingBidHolds(
  listingId: string,
  reason: string,
  opts?: { exceptBidderId?: string }
) {
  const bids = await db.usedAuctionBid.findMany({
    where: {
      listingId,
      stripePaymentIntentId: { not: null },
      ...(opts?.exceptBidderId ? { bidderId: { not: opts.exceptBidderId } } : {}),
    },
    select: { paymentIntentDbId: true, stripePaymentIntentId: true, bidderId: true },
  });

  for (const bid of bids) {
    if (opts?.exceptBidderId && bid.bidderId === opts.exceptBidderId) continue;
    await voidUsedAuctionBidHold({
      paymentIntentDbId: bid.paymentIntentDbId,
      stripePaymentIntentId: bid.stripePaymentIntentId,
      reason,
    });
  }
}

export async function renewExpiringBidHold(bid: {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  paymentIntentDbId: string | null;
  stripePaymentIntentId: string | null;
}): Promise<
  | { ok: true; auto: true; stripePaymentIntentId: string; paymentIntentDbId: string }
  | { ok: true; manual: true; reason: string }
  | { error: string }
> {
  await voidUsedAuctionBidHold({
    paymentIntentDbId: bid.paymentIntentDbId,
    stripePaymentIntentId: bid.stripePaymentIntentId,
    reason: "hold_expiring_reauth",
  });

  const prepared = await prepareUsedAuctionBidHold({
    userId: bid.bidderId,
    listingId: bid.listingId,
    bidAmount: bid.amount,
  });
  if ("error" in prepared) {
    return { ok: true, manual: true, reason: prepared.error };
  }

  const methods = await listSavedPaymentMethods(bid.bidderId);
  const pm = methods.find((m) => m.isDefault) ?? methods[0];
  if (!pm) {
    return { ok: true, manual: true, reason: "no_saved_card" };
  }

  const paid = await payUsedAuctionBidHoldWithSavedCard(bid.bidderId, prepared.orderId, pm.id);
  if ("requiresAction" in paid && paid.requiresAction) {
    return { ok: true, manual: true, reason: "requires_3ds" };
  }
  if ("error" in paid) {
    return { ok: true, manual: true, reason: paid.error };
  }
  if (!("ok" in paid)) {
    return { ok: true, manual: true, reason: "hold_failed" };
  }

  await db.usedAuctionBid.update({
    where: { id: bid.id },
    data: {
      bidStatus: "ACTIVE",
      paymentIntentDbId: prepared.orderId,
      stripePaymentIntentId: paid.stripePaymentIntentId,
      holdAmount: paid.holdAmount,
      holdExpiresAt: paid.holdExpiresAt,
    },
  });

  return {
    ok: true,
    auto: true,
    stripePaymentIntentId: paid.stripePaymentIntentId,
    paymentIntentDbId: prepared.orderId,
  };
}

export async function reauthorizeExpiringBidHoldsBatch(limit = 30) {
  if (!isStripeConfigured()) return { checked: 0, reauthorized: 0, failed: 0, voided: 0, autoReauth: 0, manualReauth: 0 };

  const leadMs = USED_AUCTION_REAUTH_LEAD_HOURS * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() + leadMs);

  const bids = await db.usedAuctionBid.findMany({
    where: {
      bidStatus: "ACTIVE",
      holdExpiresAt: { lte: cutoff, not: null },
      stripePaymentIntentId: { not: null },
      listing: {
        saleType: "AUCTION",
        auctionState: "LIVE",
        status: "SELLING",
      },
    },
    take: limit,
    select: {
      id: true,
      listingId: true,
      bidderId: true,
      amount: true,
      paymentIntentDbId: true,
      stripePaymentIntentId: true,
      listing: { select: { currentBidderId: true } },
    },
  });

  let reauthorized = 0;
  let failed = 0;
  let voided = 0;
  let autoReauth = 0;
  let manualReauth = 0;

  for (const bid of bids) {
    if (bid.listing.currentBidderId !== bid.bidderId) continue;

    try {
      const oldPi = bid.stripePaymentIntentId;
      const result = await renewExpiringBidHold(bid);
      if ("error" in result) {
        failed += 1;
        continue;
      }
      if ("auto" in result && result.auto) {
        voided += 1;
        autoReauth += 1;
        reauthorized += 1;
        const { sendUsedAuctionNotification } = await import("@/lib/used-auction-notify");
        await sendUsedAuctionNotification({
          userId: bid.bidderId,
          type: "outbid",
          title: "입찰 hold 자동 갱신됨",
          body: "카드 승인이 자동으로 갱신되었습니다. 경매를 계속 진행할 수 있습니다.",
          link: `/used/${bid.listingId}`,
        });
        safeLogWarn("used-auction-hold-reauth-auto", {
          bidId: bid.id,
          oldPi,
          newPi: result.stripePaymentIntentId,
        });
        continue;
      }

      if ("manual" in result && result.manual) {
        voided += 1;
        manualReauth += 1;
        await db.usedAuctionBid.update({
          where: { id: bid.id },
          data: { bidStatus: "SUPERSEDED", stripePaymentIntentId: null, holdExpiresAt: null },
        });
        const { sendUsedAuctionNotification } = await import("@/lib/used-auction-notify");
        await sendUsedAuctionNotification({
          userId: bid.bidderId,
          type: "outbid",
          title: "입찰 hold 갱신 필요",
          body: `카드 승인 갱신에 실패했습니다 (${result.reason}). 경매 페이지에서 동일 금액으로 다시 입찰해 주세요.`,
          link: `/used/${bid.listingId}`,
        });
        reauthorized += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { checked: bids.length, reauthorized, failed, voided, autoReauth, manualReauth };
}

export async function onAuctionEndedVoidHolds(listingId: string, winnerId: string | null) {
  if (winnerId) {
    await voidAllListingBidHolds(listingId, "auction_won", { exceptBidderId: winnerId });
  } else {
    await voidAllListingBidHolds(listingId, "auction_unsold");
  }
}
