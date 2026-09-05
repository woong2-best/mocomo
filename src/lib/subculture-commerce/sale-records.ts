import { db } from "@/lib/db";
import type { Prisma, UsedListing } from "@prisma/client";

export async function recordSubcultureSale(listing: UsedListing): Promise<void> {
  if (listing.status !== "SOLD") return;

  const soldPrice =
    listing.saleType === "AUCTION"
      ? listing.currentBidAmount ?? listing.agreedPrice ?? listing.price
      : listing.price;

  try {
    await db.subcultureSaleRecord.upsert({
      where: { listingId: listing.id },
      create: {
        listingId: listing.id,
        sellerId: listing.sellerId,
        soldPrice,
        currency: listing.currency,
        workTitle: listing.workTitle,
        animeSlug: listing.animeSlug,
        productType: listing.productType,
        characterName: listing.characterName,
        listingFormat: listing.listingFormat,
        subcultureMeta: listing.subcultureMeta ?? undefined,
      },
      update: {
        soldPrice,
        soldAt: new Date(),
      },
    });
  } catch {
    /* table may not exist yet */
  }
}

export type SaleStatQuery = {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
  take?: number;
};

export async function finalizeUsedListingSold(listingId: string): Promise<void> {
  try {
    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (listing?.status === "SOLD") await recordSubcultureSale(listing);
  } catch {
    /* optional table */
  }
}

export async function getRecentSubcultureSales(query: SaleStatQuery) {
  const take = Math.min(query.take ?? 10, 20);
  const where: Prisma.SubcultureSaleRecordWhereInput = {};

  if (query.animeSlug?.trim()) {
    where.animeSlug = query.animeSlug.trim();
  } else if (query.workTitle?.trim()) {
    where.workTitle = query.workTitle.trim();
  }
  if (query.productType?.trim()) where.productType = query.productType.trim();
  if (query.characterName?.trim()) {
    where.characterName = { contains: query.characterName.trim(), mode: "insensitive" };
  }

  if (!where.animeSlug && !where.workTitle && !where.productType) {
    return { records: [], median: null as number | null, count: 0 };
  }

  try {
    const records = await db.subcultureSaleRecord.findMany({
      where,
      orderBy: { soldAt: "desc" },
      take,
      select: {
        id: true,
        soldPrice: true,
        currency: true,
        soldAt: true,
        listingFormat: true,
        characterName: true,
        productType: true,
      },
    });

    const prices = records.map((r) => r.soldPrice).sort((a, b) => a - b);
    const median =
      prices.length === 0
        ? null
        : prices.length % 2 === 1
          ? prices[(prices.length - 1) / 2]!
          : Math.floor((prices[prices.length / 2 - 1]! + prices[prices.length / 2]!) / 2);

    return { records, median, count: records.length };
  } catch {
    return { records: [], median: null, count: 0 };
  }
}
