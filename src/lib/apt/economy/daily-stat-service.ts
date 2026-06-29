import { db } from "@/lib/db";
import { getKstDayBounds } from "./admin-dashboard-service";

/** 특정 KST 일자 집계. 인자 없으면 어제(KST) */
export async function aggregateEconomyDailyStat(forDate?: Date): Promise<void> {
  let start: Date;
  let end: Date;

  if (forDate) {
    ({ start, end } = getKstDayBounds(forDate));
  } else {
    const today = getKstDayBounds();
    end = today.start;
    start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }

  const dateOnly = new Date(start.toISOString().slice(0, 10) + "T00:00:00.000Z");

  const [
    supplyAgg,
    txs,
    marketSold,
    iapGems,
    newUsers,
    activeUsers,
    activeListings,
    walletTxCount,
  ] = await Promise.all([
    db.aptWallet.aggregate({ _sum: { gold: true, gems: true } }),
    db.aptWalletTransaction.findMany({
      where: { currency: "gold", createdAt: { gte: start, lt: end } },
      select: { amount: true },
    }),
    db.aptMarketListing.findMany({
      where: { status: "SOLD", soldAt: { gte: start, lt: end } },
      select: { priceGold: true },
    }),
    db.aptIapPurchase.aggregate({
      where: { verifiedAt: { gte: start, lt: end }, status: "VERIFIED" },
      _sum: { gemsGranted: true },
    }),
    db.user.count({ where: { createdAt: { gte: start, lt: end } } }),
    db.aptWalletTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: start, lt: end } },
    }),
    db.aptMarketListing.count({ where: { status: "SELLING", priceGold: { gt: 0 } } }),
    db.aptWalletTransaction.count({
      where: { createdAt: { gte: start, lt: end } },
    }),
  ]);

  const goldCreated = txs.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const goldDestroyed = txs.filter((t) => t.amount < 0).reduce((a, t) => a + -t.amount, 0);
  const marketVolume = marketSold.reduce((a, m) => a + m.priceGold, 0);

  await db.aptEconomyDailyStat.upsert({
    where: { date: dateOnly },
    create: {
      date: dateOnly,
      goldSupply: supplyAgg._sum.gold ?? 0,
      gemSupply: supplyAgg._sum.gems ?? 0,
      goldCreated,
      goldDestroyed,
      marketVolume,
      marketSales: marketSold.length,
      iapGemsGranted: iapGems._sum.gemsGranted ?? 0,
      newUsers,
      activeUsers: activeUsers.length,
      activeListings,
      walletTxCount,
    },
    update: {
      goldSupply: supplyAgg._sum.gold ?? 0,
      gemSupply: supplyAgg._sum.gems ?? 0,
      goldCreated,
      goldDestroyed,
      marketVolume,
      marketSales: marketSold.length,
      iapGemsGranted: iapGems._sum.gemsGranted ?? 0,
      newUsers,
      activeUsers: activeUsers.length,
      activeListings,
      walletTxCount,
    },
  });
}

/** 오늘 포함 최근 N일 집계 보정 */
export async function backfillEconomyDailyStats(days = 14): Promise<number> {
  let count = 0;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    await aggregateEconomyDailyStat(d);
    count += 1;
  }
  return count;
}
