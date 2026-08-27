import { db } from "@/lib/db";
import { buildStarMarketParams } from "@/lib/market-ranking/params";
import type { StarMarketQuery } from "@/lib/market-ranking/types";
import type { QueryHydrator } from "@/lib/feed-ranking/pipeline/types";

export const starMarketViewerHydrator: QueryHydrator<StarMarketQuery> = {
  id: "star_market_viewer",
  async hydrate(query) {
    const base = {
      ...query,
      params: query.params ?? buildStarMarketParams(),
      favoriteListingIds: new Set<string>(),
      purchasedSellerIds: new Set<string>(),
      favoriteSellerIds: new Set<string>(),
      blockedIds: new Set<string>(),
      preferredCategories: [] as string[],
      countryCode: query.countryCode || "KR",
    };

    if (!query.userId) return base;

    const userId = query.userId;
    const [user, favorites, orders, blocks] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { countryCode: true },
      }),
      db.marketplaceFavorite.findMany({
        where: { userId },
        select: { listingId: true, listing: { select: { sellerId: true, category: true } } },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      db.marketplaceOrder.findMany({
        where: {
          buyerId: userId,
          status: { in: ["PAID", "SHIPPED", "DELIVERED", "CONFIRMED", "SETTLED"] },
        },
        select: { sellerId: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      db.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
        take: 200,
      }),
    ]);

    const favoriteListingIds = new Set(favorites.map((f) => f.listingId));
    const favoriteSellerIds = new Set(favorites.map((f) => f.listing.sellerId));
    const purchasedSellerIds = new Set(orders.map((o) => o.sellerId));
    const categoryCounts = new Map<string, number>();
    for (const f of favorites) {
      categoryCounts.set(f.listing.category, (categoryCounts.get(f.listing.category) ?? 0) + 1);
    }
    const preferredCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);

    return {
      ...base,
      countryCode: user?.countryCode || base.countryCode,
      favoriteListingIds,
      favoriteSellerIds,
      purchasedSellerIds,
      blockedIds: new Set(blocks.map((b) => b.blockedId)),
      preferredCategories,
    };
  },
};
