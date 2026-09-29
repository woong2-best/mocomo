"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/** DM 거래방에 연결된 경매 가격 협상 컨텍스트 */
export async function getUsedNegotiationForChat(roomId: string, listingId?: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const listing = listingId
      ? await db.usedListing.findUnique({ where: { id: listingId } })
      : await db.usedListing.findFirst({
          where: { activeNegotiationRoomId: roomId, auctionState: "PRICE_NEGOTIATION" },
        });

    if (!listing || listing.auctionState !== "PRICE_NEGOTIATION") return null;
    if (listing.activeNegotiationRoomId !== roomId) return null;

    const userId = session.user.id;
    if (listing.sellerId !== userId && listing.negotiationBuyerId !== userId) {
      return null;
    }

    const offers = await db.usedPriceOffer.findMany({
      where: { listingId: listing.id, roomId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        proposer: { select: { id: true, username: true, name: true } },
      },
    });

    const secondBid = listing.negotiationBuyerId
      ? await db.usedAuctionBid.findFirst({
          where: { listingId: listing.id, bidderId: listing.negotiationBuyerId },
          orderBy: { amount: "desc" },
          select: { amount: true },
        })
      : null;

    return {
      listing: {
        id: listing.id,
        sellerId: listing.sellerId,
        negotiationBuyerId: listing.negotiationBuyerId,
        negotiationDueAt: listing.negotiationDueAt,
        auctionState: listing.auctionState,
        currentBidAmount: listing.currentBidAmount,
        price: listing.price,
      },
      offers,
      secondBidAmount: secondBid?.amount ?? null,
      viewerId: userId,
    };
  } catch {
    return null;
  }
}
