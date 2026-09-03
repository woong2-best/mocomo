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
    return { error: "경매 상품이 아닙니다." };
  }
  if (listing.auctionState !== "PAYMENT_PENDING") {
    return { error: "결제 대기 상태가 아닙니다." };
  }
  if (listing.winningBidderId !== user.id) {
    return { error: "낙찰자만 결제 완료를 신고할 수 있습니다." };
  }
  if (!listing.paymentDueAt || listing.paymentDueAt.getTime() < Date.now()) {
    return { error: "결제 기한이 지났습니다." };
  }

  await db.usedListing.update({
    where: { id: listingId },
    data: {
      auctionState: "PAYMENT_COMPLETED",
      paymentCompletedAt: new Date(),
    },
  });

  revalidatePath(`/used/${listingId}`);
  revalidatePath("/used/my");
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
