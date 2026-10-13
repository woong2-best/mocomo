import { db } from "@/lib/db";
import { listingImages } from "@/lib/used-market";
import { isAuctionLive, minNextBidAmount, type AuctionListingSlice } from "@/lib/used-auction";

const roomListingSelect = {
  id: true,
  title: true,
  images: true,
  price: true,
  currency: true,
  saleType: true,
  status: true,
  sellerId: true,
  currentBidAmount: true,
  currentBidderId: true,
  bidCount: true,
  bidIncrement: true,
  buyNowPrice: true,
  reservePrice: true,
  auctionEndsAt: true,
  auctionState: true,
  antiSnipeMinutes: true,
  auctionExtensionCount: true,
  seller: { select: { id: true, username: true, name: true, image: true } },
} as const;

export async function getAuctionBidRoom(listingId: string, viewerId?: string | null) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: roomListingSelect,
  });
  if (!listing || listing.saleType !== "AUCTION") return null;

  const bids = await db.usedAuctionBid.findMany({
    where: { listingId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      amount: true,
      createdAt: true,
      bidderId: true,
      bidder: { select: { username: true, name: true } },
    },
  });

  const slice = listing as AuctionListingSlice;
  const live = isAuctionLive(slice);
  const leaderId = listing.currentBidderId;
  let messageRoomId: string | null = null;
  if (viewerId && leaderId && (viewerId === listing.sellerId || viewerId === leaderId)) {
    const chat = await db.usedListingChat.findUnique({
      where: { listingId_buyerId: { listingId, buyerId: leaderId } },
      select: { roomId: true },
    });
    messageRoomId = chat?.roomId ?? null;
  }

  return {
    listing: {
      id: listing.id,
      title: listing.title,
      image: listingImages(listing.images)[0] ?? null,
      price: listing.price,
      currency: listing.currency,
      currentBidAmount: listing.currentBidAmount,
      bidCount: listing.bidCount,
      minNextBid: live ? minNextBidAmount(slice) : null,
      auctionEndsAt: listing.auctionEndsAt?.toISOString() ?? null,
      auctionLive: live,
      isOwner: viewerId === listing.sellerId,
      isLeader: viewerId != null && viewerId === leaderId,
      sellerName: listing.seller?.name?.trim() || listing.seller?.username || "",
      messageRoomId,
    },
    bids: bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      createdAt: bid.createdAt.toISOString(),
      name: bid.bidder.name?.trim() || bid.bidder.username,
      mine: viewerId === bid.bidderId,
    })),
  };
}
