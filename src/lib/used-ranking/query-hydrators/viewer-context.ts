import { db } from "@/lib/db";
import { buildUsedMarketParams } from "@/lib/used-ranking/params";
import type { UsedMarketQuery } from "@/lib/used-ranking/types";
import type { QueryHydrator } from "@/lib/feed-ranking/pipeline/types";

export const usedMarketViewerHydrator: QueryHydrator<UsedMarketQuery> = {
  id: "used_market_viewer",
  async hydrate(query) {
    const base = {
      ...query,
      params: query.params ?? buildUsedMarketParams(),
      favoriteListingIds: new Set<string>(),
      favoriteCategories: new Set<string>(),
      favoriteWorks: new Set<string>(),
      blockedIds: new Set<string>(),
      countryCode: query.countryCode ?? null,
      preferredRegion: query.preferredRegion ?? null,
      preferredSido: query.preferredSido ?? null,
    };

    if (!query.userId) return base;

    const userId = query.userId;
    const [user, favorites, blocks, recentListings] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { countryCode: true },
      }),
      db.usedFavorite.findMany({
        where: { userId },
        select: {
          listingId: true,
          listing: { select: { category: true, workTitle: true, region: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      db.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
        take: 200,
      }),
      db.usedListing.findMany({
        where: { sellerId: userId },
        select: { region: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

    const favoriteListingIds = new Set(favorites.map((f) => f.listingId));
    const favoriteCategories = new Set(
      favorites.map((f) => f.listing.category).filter(Boolean)
    );
    const favoriteWorks = new Set(
      favorites.map((f) => f.listing.workTitle).filter((w): w is string => !!w?.trim())
    );

    return {
      ...base,
      countryCode: user?.countryCode || base.countryCode,
      preferredRegion: recentListings[0]?.region ?? favorites[0]?.listing.region ?? null,
      favoriteListingIds,
      favoriteCategories,
      favoriteWorks,
      blockedIds: new Set(blocks.map((b) => b.blockedId)),
    };
  },
};
