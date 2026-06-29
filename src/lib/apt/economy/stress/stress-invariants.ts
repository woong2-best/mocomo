import { PrismaClient } from "@prisma/client";

export type InvariantReport = {
  negativeGold: number;
  storageMismatch: number;
  duplicateMarketBuys: number;
  orphanListingsSelling: number;
};

export async function checkEconomyInvariants(
  db: PrismaClient,
  userIds: string[]
): Promise<InvariantReport> {
  if (!userIds.length) {
    return {
      negativeGold: 0,
      storageMismatch: 0,
      duplicateMarketBuys: 0,
      orphanListingsSelling: 0,
    };
  }

  const [negativeGold, invRows, storageRows, soldListings] = await Promise.all([
    db.aptWallet.count({
      where: { userId: { in: userIds }, gold: { lt: 0 } },
    }),
    db.aptInventoryItem.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, itemId: true, quantity: true },
    }),
    db.aptStorageItem.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, itemId: true, quantity: true },
    }),
    db.aptMarketListing.findMany({
      where: { status: "SOLD", buyerId: { not: null } },
      select: { id: true, buyerId: true },
    }),
  ]);

  const invMap = new Map<string, number>();
  for (const r of invRows) {
    invMap.set(`${r.userId}:${r.itemId}`, r.quantity);
  }

  let storageMismatch = 0;
  for (const s of storageRows) {
    const owned = invMap.get(`${s.userId}:${s.itemId}`) ?? 0;
    if (s.quantity > owned) storageMismatch += 1;
  }

  const buyRefs = await db.aptWalletTransaction.groupBy({
    by: ["referenceId"],
    where: {
      userId: { in: userIds },
      referenceType: "AptMarketListing",
      referenceId: { contains: ":buy" },
    },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  const duplicateMarketBuys = buyRefs.length;

  const orphanListingsSelling = await db.aptMarketListing.count({
    where: {
      sellerId: { in: userIds },
      status: "SELLING",
      priceGold: { gt: 0 },
      hiddenByAdmin: false,
    },
  });

  void soldListings;

  return {
    negativeGold,
    storageMismatch,
    duplicateMarketBuys,
    orphanListingsSelling,
  };
}
