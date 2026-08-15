import { NextRequest, NextResponse } from "next/server";
import type { MarketplaceListingType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { listMarketplaceListings } from "@/actions/marketplace";
import { MARKETPLACE_LISTING_TYPES } from "@/lib/marketplace/constants";

const TYPE_IDS = new Set(MARKETPLACE_LISTING_TYPES.map((t) => t.id));

/**
 * STAR / creator market browse (web `/market`).
 * Distinct from used market at `/api/mobile/marketplace`.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-star-market-list", 60);
  if (limited) return limited;


  const typeRaw = req.nextUrl.searchParams.get("type")?.trim().toUpperCase() || "ALL";
  const type =
    typeRaw === "ALL" || !TYPE_IDS.has(typeRaw as MarketplaceListingType)
      ? "ALL"
      : (typeRaw as MarketplaceListingType);
  const category = req.nextUrl.searchParams.get("category")?.trim() || undefined;
  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const cursor = req.nextUrl.searchParams.get("cursor")?.trim() || undefined;
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "24") || 24, 48);

  const { items, nextCursor } = await listMarketplaceListings({
    type,
    category,
    q,
    take,
    cursor,
  });

  return NextResponse.json(
    {
      items: items.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        category: row.category,
        priceAmount: row.priceAmount,
        currency: row.currency,
        coverUrl: row.coverUrl,
        stock: row.stock,
        productionDays: row.productionDays,
        favoriteCount: row.favoriteCount,
        salesCount: row.salesCount,
        isNsfw: row.isNsfw,
        sellerId: row.sellerId,
        createdAt: row.createdAt.toISOString(),
        seller: row.seller
          ? {
              id: row.seller.id,
              username: row.seller.username,
              image: row.seller.image,
              displayName: row.sellerProfile?.displayName ?? null,
            }
          : null,
      })),
      nextCursor,
    },
    {
      headers: {
        "Cache-Control":
          q || category || type !== "ALL"
            ? "private, no-cache"
            : "public, s-maxage=15, stale-while-revalidate=45",
      },
    }
  );
}
