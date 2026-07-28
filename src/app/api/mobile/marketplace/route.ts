import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getUsedListings } from "@/actions/used-market";
import { listingImages } from "@/lib/used-market";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-list", 60);
  if (limited) return limited;

  await getMobileUserId(req);
  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "24") || 24, 48);

  const listings = await getUsedListings({ status: "SELLING", take, q });
  const items = listings.map((l) => {
    const images = listingImages(l.images);
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      thumbnailUrl: images[0] ?? null,
      region: l.region,
      status: l.status,
      saleType: l.saleType,
      createdAt: l.createdAt.toISOString(),
      favoriteCount: l._count?.favorites ?? 0,
      auctionEndsAt: l.auctionEndsAt?.toISOString() ?? null,
      currentBidAmount: l.currentBidAmount ?? null,
      bidCount: l.bidCount ?? null,
      workTitle: l.workTitle ?? null,
      productType: l.productType ?? null,
      seller: l.seller
        ? { id: l.seller.id, username: l.seller.username, image: l.seller.image }
        : null,
    };
  });

  return NextResponse.json({ items });
}
