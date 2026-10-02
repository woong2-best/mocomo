"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { assertUsedMarketAccess } from "@/lib/used-market-access";
import { getUsedListingMarketplaceOrderId, usedOrderLink } from "@/lib/used-auction-marketplace-order";

/** 낙찰자 — Stripe 주문이 있으면 주문 페이지로, 없으면 honor 결제 완료 신고 */
export async function markAuctionPaymentComplete(listingId: string) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const orderId = await getUsedListingMarketplaceOrderId(listingId);
  if (orderId) {
    return { success: true, orderId, redirectPath: usedOrderLink(orderId) };
  }

  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.saleType !== "AUCTION") {
    return { error: "actions.s13bzg0h" };
  }
  if (listing.auctionState !== "PAYMENT_PENDING") {
    return { error: "actions.s10iyl0m" };
  }
  if (listing.winningBidderId !== user.id) {
    return { error: "actions.s1csu88a" };
  }
  if (!listing.paymentDueAt || listing.paymentDueAt.getTime() < Date.now()) {
    return { error: "actions.sj0g8j9" };
  }

  await db.usedListing.update({
    where: { id: listingId },
    data: {
      auctionState: "PAYMENT_COMPLETED",
      paymentCompletedAt: new Date(),
    },
  });

  revalidatePath(`/market/${listingId}`);
  revalidatePath("/market/my");
  return { success: true };
}

export async function getAuctionPaymentStatus(listingId: string) {
  try {
    const listing = await db.usedListing.findUnique({
      where: { id: listingId },
      select: {
        auctionState: true,
        paymentDueAt: true,
        paymentCompletedAt: true,
        winningBidderId: true,
        negotiationDueAt: true,
        negotiationBuyerId: true,
        agreedPrice: true,
        currentBidAmount: true,
        price: true,
        forfeitedWinnerCount: true,
        marketplaceOrderId: true,
      },
    });
    return { listing };
  } catch {
    return { listing: null };
  }
}
