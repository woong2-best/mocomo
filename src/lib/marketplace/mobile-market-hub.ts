import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const listingCardSelect = {
  id: true,
  title: true,
  type: true,
  category: true,
  priceAmount: true,
  currency: true,
  coverUrl: true,
  tags: true,
  seller: { select: { id: true, username: true, image: true } },
  sellerProfile: { select: { displayName: true } },
} as const;

export async function listMarketplaceFavoritesForUser(userId: string) {
  const rows = await db.marketplaceFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      listing: { select: listingCardSelect },
    },
  });
  return rows.map((r) => r.listing).filter((l) => l && l.id);
}

export async function toggleMarketplaceFavoriteForUser(userId: string, listingId: string) {
  const existing = await db.marketplaceFavorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    await db.$transaction([
      db.marketplaceFavorite.delete({ where: { id: existing.id } }),
      db.marketplaceListing.update({
        where: { id: listingId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    return { favorited: false };
  }
  await db.$transaction([
    db.marketplaceFavorite.create({ data: { userId, listingId } }),
    db.marketplaceListing.update({
      where: { id: listingId },
      data: { favoriteCount: { increment: 1 } },
    }),
  ]);
  return { favorited: true };
}

/** 해시태그 겹치는 상품 (최근 본 상품 연관) */
export async function listMarketplaceListingsByTags(
  tags: string[],
  opts?: { excludeIds?: string[]; take?: number }
) {
  const normalized = [...new Set(tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean))].slice(
    0,
    10
  );
  if (normalized.length === 0) return [];

  const where: Prisma.MarketplaceListingWhereInput = {
    status: "ACTIVE",
    type: { not: "DIGITAL" },
    tags: { hasSome: normalized },
  };
  if (opts?.excludeIds?.length) {
    where.id = { notIn: opts.excludeIds.slice(0, 20) };
  }

  return db.marketplaceListing.findMany({
    where,
    orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
    take: Math.min(opts?.take ?? 24, 48),
    select: listingCardSelect,
  });
}

/** 구매한 크리에이터(판매자)의 다른 상품 */
export async function listCreatorSellerListingsForUser(userId: string, take = 24) {
  const orders = await db.marketplaceOrder.findMany({
    where: {
      buyerId: userId,
      status: {
        notIn: ["AWAITING_PAYMENT", "CANCELLED", "REFUNDED"],
      },
    },
    select: { sellerId: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const sellerIds = [...new Set(orders.map((o) => o.sellerId))].slice(0, 20);
  if (sellerIds.length === 0) return { sellers: [] as { id: string; username: string }[], items: [] };

  const sellers = await db.user.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, username: true, name: true, image: true },
  });

  const items = await db.marketplaceListing.findMany({
    where: {
      status: "ACTIVE",
      type: { not: "DIGITAL" },
      sellerId: { in: sellerIds },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(take, 48),
    select: listingCardSelect,
  });

  return { sellers, items };
}

export async function listPaidSponsorEventsForMobile() {
  return db.event.findMany({
    where: {
      endsAt: { gte: new Date() },
      createdById: { not: null },
      registrationFeePaid: true,
      status: "PUBLISHED",
      imageUrl: { not: null },
    },
    select: { id: true, title: true, imageUrl: true },
    orderBy: { startsAt: "asc" },
    take: 60,
  });
}

/** 시간(시) 단위 로테이션 — 모바일 광고 배너 */
export function pickHourlySponsorEvent<
  T extends { id: string; title: string; imageUrl: string | null },
>(pool: T[]): T | null {
  const eligible = pool.filter((e) => e.imageUrl?.trim());
  if (eligible.length === 0) return null;
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  return eligible[hourBucket % eligible.length] ?? null;
}

export async function listRecentBuyerOrdersForUser(userId: string, take = 8) {
  const orders = await db.marketplaceOrder.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      items: {
        include: {
          listing: { select: { coverUrl: true } },
        },
      },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    coverUrl: o.items[0]?.listing?.coverUrl ?? null,
    title: o.items[0]?.titleSnapshot ?? "주문",
    itemCount: o.items.length,
  }));
}
