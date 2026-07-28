import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getUsedListing } from "@/actions/used-market";
import { listingImages } from "@/lib/used-market";
import { isAuctionLive, minNextBidAmount } from "@/lib/used-auction";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-detail", 60);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await getUsedListing(id, viewerId ?? undefined);
  if (!result?.listing) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  const listing = result.listing;
  const images = listingImages(listing.images);
  const auctionLive = isAuctionLive(listing);

  return NextResponse.json({
    item: {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      images,
      region: listing.region,
      status: listing.status,
      saleType: listing.saleType,
      createdAt: listing.createdAt.toISOString(),
      favoriteCount: result.favoriteCount ?? listing._count?.favorites ?? 0,
      favorited: result.favorited ?? false,
      buyerChatRoomId: result.buyerChatRoomId ?? null,
      auctionEndsAt: listing.auctionEndsAt?.toISOString() ?? null,
      currentBidAmount: listing.currentBidAmount ?? null,
      bidCount: listing.bidCount ?? null,
      bidIncrement: listing.bidIncrement ?? null,
      buyNowPrice: listing.buyNowPrice ?? null,
      auctionState: listing.auctionState ?? null,
      auctionLive,
      minNextBid: auctionLive ? minNextBidAmount(listing) : null,
      workTitle: listing.workTitle ?? null,
      productType: listing.productType ?? null,
      seller: listing.seller
        ? {
            id: listing.seller.id,
            username: listing.seller.username,
            image: listing.seller.image,
            name: listing.seller.name,
          }
        : null,
      isOwner: viewerId ? listing.sellerId === viewerId : false,
    },
  });
}
