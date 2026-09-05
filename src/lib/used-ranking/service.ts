import { db } from "@/lib/db";
import { getUsedListings } from "@/actions/used-market";
import {
  getOrComputeUsedMarketRanking,
  runUsedMarketRankingLive,
} from "@/lib/used-ranking/compute";
import type { UsedListingStatus } from "@prisma/client";

export type UsedMarketBrowseMode = "discover" | "latest";

function hasSearchFilters(params: {
  q?: string;
  category?: string;
  sido?: string;
  region?: string;
  country?: string;
  work?: string;
  product?: string;
  condition?: string;
  limited?: string;
  trade?: string;
  anime?: string;
}) {
  return !!(
    params.q?.trim() ||
    (params.category && params.category !== "ALL") ||
    params.sido ||
    params.region ||
    params.country ||
    params.work ||
    params.product ||
    params.condition ||
    params.limited ||
    params.trade ||
    params.anime
  );
}

async function rankedListingIds(
  userId: string | null,
  opts: {
    category?: string;
    saleType?: "FIXED" | "AUCTION";
    liveAuctionOnly?: boolean;
    preferredRegion?: string | null;
    take: number;
    cursor?: string;
  }
) {
  let ids: string[];
  if (userId) {
    const ranked = await getOrComputeUsedMarketRanking(userId, {
      filterCategory: opts.category,
      filterSaleType: opts.saleType,
      liveAuctionOnly: opts.liveAuctionOnly,
      preferredRegion: opts.preferredRegion,
    });
    ids = ranked.map((r) => r.listingId);
  } else {
    ids = await runUsedMarketRankingLive({
      filterCategory: opts.category,
      filterSaleType: opts.saleType,
      liveAuctionOnly: opts.liveAuctionOnly,
      preferredRegion: opts.preferredRegion,
    });
  }

  let start = 0;
  if (opts.cursor) {
    const idx = ids.indexOf(opts.cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }

  return { ids: ids.slice(start, start + opts.take + 1), hasRank: ids.length > 0 };
}

export async function resolveUsedMarketBrowse(params: {
  userId?: string | null;
  mode?: UsedMarketBrowseMode;
  status?: UsedListingStatus;
  q?: string;
  category?: string;
  sido?: string;
  region?: string;
  country?: string;
  work?: string;
  product?: string;
  condition?: string;
  limited?: string;
  trade?: string;
  anime?: string;
  saleType?: "FIXED" | "AUCTION";
  liveAuctionOnly?: boolean;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(params.take ?? 48, 48);
  const mode = params.mode ?? "discover";

  if (mode === "latest" || hasSearchFilters(params)) {
    return getUsedListings({
      status: params.status ?? "SELLING",
      q: params.q,
      category: params.category,
      sido: params.sido,
      region: params.region,
      country: params.country,
      work: params.work,
      product: params.product,
      condition: params.condition,
      limited: params.limited,
      trade: params.trade,
      anime: params.anime,
      saleType: params.saleType,
      liveAuctionOnly: params.liveAuctionOnly,
      take,
    });
  }

  const { ids, hasRank } = await rankedListingIds(params.userId ?? null, {
    category: params.category,
    saleType: params.saleType,
    liveAuctionOnly: params.liveAuctionOnly,
    preferredRegion: params.region ?? params.sido ?? null,
    take,
    cursor: params.cursor,
  });

  if (!hasRank) {
    return getUsedListings({
      status: params.status ?? "SELLING",
      take,
      saleType: params.saleType,
      liveAuctionOnly: params.liveAuctionOnly,
    });
  }

  const pageIds = ids.slice(0, take);
  if (!pageIds.length) return [];

  const rows = await db.usedListing.findMany({
    where: { id: { in: pageIds }, status: params.status ?? "SELLING" },
    include: {
      seller: {
        select: {
          id: true,
          username: true,
          image: true,
          name: true,
          supportTierSent: true,
        },
      },
      _count: { select: { favorites: true } },
    },
  });

  const byId = new Map(rows.map((r) => [r.id, r]));
  return pageIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => r != null);
}
