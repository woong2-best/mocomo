"use server";

import { requireAuth } from "@/lib/auth";
import {
  confirmUsedAuctionBidHold,
  payUsedAuctionBidHoldWithSavedCard,
  prepareUsedAuctionBidHoldWithMethods,
  resolveBidHoldMode,
} from "@/lib/used-auction-bid-hold";
import { db } from "@/lib/db";

export async function prepareUsedAuctionBidHoldAction(listingId: string, bidAmount: number) {
  const user = await requireAuth();
  return prepareUsedAuctionBidHoldWithMethods({
    userId: user.id,
    email: user.email,
    listingId,
    bidAmount,
  });
}

export async function confirmUsedAuctionBidHoldAction(
  listingId: string,
  paymentIntentDbId: string
) {
  const user = await requireAuth();
  return confirmUsedAuctionBidHold(user.id, listingId, paymentIntentDbId);
}

export async function payUsedAuctionBidHoldAction(
  listingId: string,
  paymentIntentDbId: string,
  paymentMethodId: string
) {
  const user = await requireAuth();
  const result = await payUsedAuctionBidHoldWithSavedCard(
    user.id,
    paymentIntentDbId,
    paymentMethodId
  );
  if ("requiresAction" in result && result.requiresAction) {
    return result;
  }
  if ("error" in result) return result;
  const meta = await db.paymentIntent.findUnique({
    where: { id: paymentIntentDbId },
    select: { metadata: true },
  });
  const holdListingId =
    (meta?.metadata as { listingId?: string } | null)?.listingId ?? listingId;
  if (holdListingId !== listingId) {
    return { error: "경매 정보가 일치하지 않습니다." };
  }
  return result;
}

export async function getUsedAuctionBidHoldModeAction(listingId: string) {
  const user = await requireAuth();
  void user;
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { depositEnabled: true, currency: true, sellerId: true, saleType: true },
  });
  if (!listing || listing.saleType !== "AUCTION") {
    return { mode: "none" as const };
  }
  const mode = await resolveBidHoldMode({ listing });
  return { mode };
}
