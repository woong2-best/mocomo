import { db } from "@/lib/db";
import { getUsedListings } from "@/actions/used-market";
import {
  buildScopedUsedListingWhere,
  resolveScopedUsedCountry,
  resolveUsedMarketScope,
  resolveUsedViewerCountry,
} from "@/lib/used-market-locale-scope";
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
    viewerCountryCode: string;
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
      viewerCountryCode: opts.viewerCountryCode,
    });
    ids = ranked.map((r) => r.listingId);
  } else {
    ids = await runUsedMarketRankingLive({
      filterCategory: opts.category,
      filterSaleType: opts.saleType,
      liveAuctionOnly: opts.liveAuctionOnly,
      preferredRegion: opts.preferredRegion,
      viewerCountryCode: opts.viewerCountryCode,
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
  /** Resolved viewer country — auto-loaded from userId when omitted */
  viewerCountryCode?: string;
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
  const viewerCountryCode = params.viewerCountryCode
    ? resolveScopedUsedCountry(params.viewerCountryCode, params.country)
    : await resolveUsedViewerCountry({
        userId: params.userId,
      });
  const scopedCountry = resolveScopedUsedCountry(viewerCountryCode, params.country);

  if (mode === "latest" || hasSearchFilters(params)) {
    return getUsedListings(
      {
        status: params.status ?? "SELLING",
        q: params.q,
        category: params.category,
        sido: params.sido,
        region: params.region,
        work: params.work,
        product: params.product,
        condition: params.condition,
        limited: params.limited,
        trade: params.trade,
        anime: params.anime,
        saleType: params.saleType,
        liveAuctionOnly: params.liveAuctionOnly,
        take,
      },
      {
        viewerId: params.userId ?? null,
        sessionCountry: scopedCountry,
      }
    );
  }

  const { ids, hasRank } = await rankedListingIds(params.userId ?? null, {
    category: params.category,
    saleType: params.saleType,
    liveAuctionOnly: params.liveAuctionOnly,
    preferredRegion: params.region ?? params.sido ?? null,
    viewerCountryCode: scopedCountry,
    take,
    cursor: params.cursor,
  });

  if (!hasRank) {
    return getUsedListings(
      {
        status: params.status ?? "SELLING",
        take,
        saleType: params.saleType,
        liveAuctionOnly: params.liveAuctionOnly,
      },
      {
        viewerId: params.userId ?? null,
        sessionCountry: scopedCountry,
      }
    );
  }

  const pageIds = ids.slice(0, take);
  if (!pageIds.length) return [];

  const locality = await resolveUsedMarketScope({
    userId: params.userId,
    sessionCountry: scopedCountry,
  });

  const rows = await db.usedListing.findMany({
    where: {
      AND: [
        { id: { in: pageIds } },
        { status: params.status ?? "SELLING" },
        buildScopedUsedListingWhere(locality),
      ],
    },
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
