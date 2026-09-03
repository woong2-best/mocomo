/**
 * Shared used-auction bid execution (web + mobile).
 */

import { db } from "@/lib/db";
import {
  extendedAuctionEndsAt,
  isAuctionLive,
  minNextBidAmount,
} from "@/lib/used-auction";
import { formatUsedPrice, maxUsedListingPrice, maxUsedListingPriceLabel, normalizeUsedCurrency } from "@/lib/used-market";
import {
  resolveBidHoldMode,
  validateBidHoldAmount,
  verifyUsedAuctionBidHold,
  voidActiveHoldForBidder,
} from "@/lib/used-auction-bid-hold";

export type ExecuteUsedAuctionBidInput = {
  userId: string;
  listingId: string;
  bidAmount: number;
  termsAccepted: boolean;
  paymentIntentDbId?: string | null;
};

export type ExecuteUsedAuctionBidResult =
  | { success: true; amount: number; extended: boolean; holdRequired: boolean }
  | { error: string; needsAdultVerify?: true; needsBidHold?: true; holdMode?: string };

export async function executeUsedAuctionBid(
  input: ExecuteUsedAuctionBidInput
): Promise<ExecuteUsedAuctionBidResult> {
  if (!input.termsAccepted) {
    return { error: "입찰 전 결제 의무 및 이용 제한 안내에 동의해 주세요." };
  }

  const bidAmount = Math.floor(input.bidAmount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { error: "입찰가를 올바르게 입력해 주세요." };
  }

  const listing = await db.usedListing.findUnique({ where: { id: input.listingId } });
  if (!listing || listing.saleType !== "AUCTION") {
    return { error: "경매 상품이 아닙니다." };
  }
  const maxPrice = maxUsedListingPrice(listing.currency);
  if (bidAmount > maxPrice) {
    return { error: `입찰가는 ${maxUsedListingPriceLabel(listing.currency)} 이하입니다.` };
  }
  if (listing.sellerId === input.userId) return { error: "본인 경매에는 입찰할 수 없습니다." };
  if (!isAuctionLive(listing)) return { error: "마감된 경매입니다." };

  const minBid = minNextBidAmount(listing);
  if (bidAmount < minBid) {
    return { error: `최소 입찰가는 ${formatUsedPrice(minBid, listing.currency)}입니다.` };
  }
  if (listing.buyNowPrice != null && bidAmount >= listing.buyNowPrice) {
    return {
      error: `즉시구매가 ${formatUsedPrice(listing.buyNowPrice, listing.currency)}입니다. 즉시구매를 이용해 주세요.`,
    };
  }

  const holdMode = await resolveBidHoldMode({ listing });
  const currency = normalizeUsedCurrency(listing.currency);
  const holdRequired = holdMode === "stripe";

  if (holdRequired) {
    const holdMin = validateBidHoldAmount(bidAmount, currency);
    if (holdMin) return { error: holdMin.error };
    if (!input.paymentIntentDbId) {
      return {
        error: "입찰 전 카드 hold 승인이 필요합니다.",
        needsBidHold: true,
        holdMode,
      };
    }
  }

  let holdMeta:
    | { stripePaymentIntentId: string; holdAmount: number; holdExpiresAt: Date; paymentIntentDbId: string }
    | null = null;

  if (holdRequired && input.paymentIntentDbId) {
    const verified = await verifyUsedAuctionBidHold({
      userId: input.userId,
      paymentIntentDbId: input.paymentIntentDbId,
      listingId: input.listingId,
      bidAmount,
    });
    if ("error" in verified) return { error: verified.error };
    holdMeta = {
      paymentIntentDbId: input.paymentIntentDbId,
      stripePaymentIntentId: verified.stripePaymentIntentId,
      holdAmount: verified.holdAmount,
      holdExpiresAt: verified.holdExpiresAt,
    };
  }

  const endsAt = listing.auctionEndsAt!;
  const prevBidderId = listing.currentBidderId;
  const extendTo = extendedAuctionEndsAt(
    endsAt,
    listing.antiSnipeMinutes,
    listing.auctionExtensionCount ?? 0
  );

  try {
    await db.$transaction(async (tx) => {
      const fresh = await tx.usedListing.findUnique({ where: { id: input.listingId } });
      if (!fresh || !isAuctionLive(fresh)) throw new Error("CLOSED");
      const minFresh = minNextBidAmount(fresh);
      if (bidAmount < minFresh) throw new Error("LOW_BID");

      await tx.usedAuctionBid.create({
        data: {
          listingId: input.listingId,
          bidderId: input.userId,
          amount: bidAmount,
          termsAcceptedAt: new Date(),
          ...(holdMeta
            ? {
                paymentIntentDbId: holdMeta.paymentIntentDbId,
                stripePaymentIntentId: holdMeta.stripePaymentIntentId,
                holdAmount: holdMeta.holdAmount,
                holdExpiresAt: holdMeta.holdExpiresAt,
              }
            : {}),
        },
      });
      await tx.usedListing.update({
        where: { id: input.listingId },
        data: {
          currentBidAmount: bidAmount,
          currentBidderId: input.userId,
          bidCount: { increment: 1 },
          auctionState: "LIVE",
          ...(extendTo
            ? {
                auctionEndsAt: extendTo,
                auctionExtensionCount: { increment: 1 },
              }
            : {}),
        },
      });
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "CLOSED") return { error: "마감된 경매입니다." };
      if (e.message === "LOW_BID") {
        const fresh = await db.usedListing.findUnique({ where: { id: input.listingId } });
        if (fresh) {
          return {
            error: `다른 분이 먼저 입찰했습니다. 최소 ${formatUsedPrice(minNextBidAmount(fresh), fresh.currency)} 이상으로 입찰해 주세요.`,
          };
        }
      }
    }
    return { error: "입찰에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (prevBidderId && prevBidderId !== input.userId) {
    await voidActiveHoldForBidder(input.listingId, prevBidderId, "outbid");
  }

  return { success: true, amount: bidAmount, extended: !!extendTo, holdRequired };
}
