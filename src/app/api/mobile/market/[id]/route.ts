import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getMarketplaceListing } from "@/actions/marketplace";
import { listingTypeLabel } from "@/lib/marketplace/constants";
import { isPaymentsConfigured } from "@/lib/payments";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-star-market-detail", 60);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const listing = await getMarketplaceListing(id);
  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      type: listing.type,
      typeLabel: listingTypeLabel(listing.type),
      category: listing.category,
      tags: listing.tags,
      priceAmount: listing.priceAmount,
      currency: listing.currency,
      coverUrl: listing.coverUrl,
      stock: listing.stock,
      productionDays: listing.productionDays,
      favoriteCount: listing.favoriteCount,
      salesCount: listing.salesCount,
      viewCount: listing.viewCount,
      images: [
        ...(listing.coverUrl ? [listing.coverUrl] : []),
        ...listing.media.map((m) => m.url).filter((u) => u && u !== listing.coverUrl),
      ],
      seller: listing.seller
        ? {
            id: listing.seller.id,
            username: listing.seller.username,
            image: listing.seller.image,
            name: listing.seller.name,
            displayName: listing.sellerProfile?.displayName ?? null,
            ratingAvg: listing.sellerProfile?.ratingAvg ?? null,
          }
        : null,
      isOwner: viewerId ? listing.sellerId === viewerId : false,
      paymentsEnabled: isPaymentsConfigured(),
      shipToCountries: listing.shipToCountries ?? [],
      shipsWorldwide: listing.shipsWorldwide ?? false,
      shippingFeeType: listing.shippingFeeType,
      shippingFeeFixed: listing.shippingFeeFixed,
      createdAt: listing.createdAt.toISOString(),
      publishedAt: listing.publishedAt?.toISOString() ?? null,
      isNsfw: listing.isNsfw,
      sellerId: listing.sellerId,
    },
  });
}
