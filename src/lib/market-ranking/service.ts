import type { MarketplaceListingType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { listMarketplaceListings } from "@/actions/marketplace";
import {
  getOrComputeStarMarketRanking,
  runStarMarketRankingLive,
} from "@/lib/market-ranking/compute";

export type StarMarketBrowseMode = "discover" | "latest";

const starListingSelect = {
  id: true,
  title: true,
  type: true,
  category: true,
  priceAmount: true,
  currency: true,
  coverUrl: true,
  stock: true,
  productionDays: true,
  favoriteCount: true,
  salesCount: true,
  isNsfw: true,
  sellerId: true,
  createdAt: true,
  seller: { select: { id: true, username: true, image: true } },
  sellerProfile: { select: { displayName: true, ratingAvg: true, salesCount: true } },
} satisfies Prisma.MarketplaceListingSelect;

function hasSearchFilters(params: {
  q?: string;
  category?: string;
  type?: MarketplaceListingType | "ALL";
}) {
  return !!(params.q?.trim() || params.category || (params.type && params.type !== "ALL"));
}

async function rankedListingIds(
  userId: string | null,
  opts: {
    type?: MarketplaceListingType | "ALL";
    category?: string;
    take: number;
    cursor?: string;
  }
) {
  let ids: string[];
  if (userId) {
    const ranked = await getOrComputeStarMarketRanking(userId, {
      filterType: opts.type,
      filterCategory: opts.category,
    });
    ids = ranked.map((r) => r.listingId);
  } else {
    ids = await runStarMarketRankingLive({
      filterType: opts.type,
      filterCategory: opts.category,
    });
  }

  let start = 0;
  if (opts.cursor) {
    const idx = ids.indexOf(opts.cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }

  return { ids: ids.slice(start, start + opts.take + 1), hasRank: ids.length > 0 };
}

export async function resolveStarMarketBrowse(params: {
  userId?: string | null;
  mode?: StarMarketBrowseMode;
  type?: MarketplaceListingType | "ALL";
  category?: string;
  q?: string;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(params.take ?? 24, 48);
  const mode = params.mode ?? "discover";

  if (mode === "latest" || hasSearchFilters(params)) {
    return listMarketplaceListings({
      type: params.type,
      category: params.category,
      q: params.q,
      take,
      cursor: params.cursor,
    });
  }

  const { ids, hasRank } = await rankedListingIds(params.userId ?? null, {
    type: params.type,
    category: params.category,
    take,
    cursor: params.cursor,
  });

  if (!hasRank) {
    return listMarketplaceListings({ type: params.type, category: params.category, take, cursor: params.cursor });
  }

  const pageIds = ids.slice(0, take);
  const nextCursor = ids.length > take ? ids[take] ?? null : null;
  if (!pageIds.length) return { items: [], nextCursor: null };

  const rows = await db.marketplaceListing.findMany({
    where: { id: { in: pageIds }, status: "ACTIVE" },
    select: starListingSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => r != null);

  return { items, nextCursor };
}
