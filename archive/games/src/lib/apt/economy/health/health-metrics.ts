import { db } from "@/lib/db";
import { getKstDayBounds } from "../admin-dashboard-service";
import { getEconomyConfigFull } from "../config-service";
import type { HealthMetrics } from "./health-types";

function truncateHour(d: Date): Date {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x;
}

export async function recordHealthDomainEvent(
  domain: string,
  eventKey: string,
  delta = 1
): Promise<void> {
  const hour = truncateHour(new Date());
  const existing = await db.aptEconomyHealthSnapshot.findUnique({
    where: { hour_domain: { hour, domain } },
  });
  const metrics = { ...((existing?.metrics as Record<string, number>) ?? {}) };
  metrics[eventKey] = (metrics[eventKey] ?? 0) + delta;

  await db.aptEconomyHealthSnapshot.upsert({
    where: { hour_domain: { hour, domain } },
    create: { hour, domain, score: existing?.score ?? 100, metrics },
    update: { metrics },
  });
}

export async function collectHealthMetrics(): Promise<HealthMetrics> {
  const { start, end } = getKstDayBounds();
  const config = await getEconomyConfigFull();
  const hour = truncateHour(new Date());
  const hourSnaps = await db.aptEconomyHealthSnapshot.findMany({ where: { hour } });
  const hourCounters = (d: string) =>
    (hourSnaps.find((s) => s.domain === d)?.metrics as Record<string, number>) ?? {};

  const [
    goldTx,
    negativeWallets,
    marketListLogs,
    marketCancelLogs,
    soldToday,
    liveGoldTx,
    notificationsToday,
    unreadNotif,
    fraudProfiles,
    fraudHistoryToday,
    pendingOps,
    latestSnapshot,
    restoreLogs,
    priceHistory,
    baselineSnap,
    currentHighRisk,
    iapPendingRetries,
    iapRefundsToday,
  ] = await Promise.all([
    db.aptWalletTransaction.findMany({
      where: { createdAt: { gte: start, lt: end }, currency: "gold" },
      select: { amount: true, referenceId: true, type: true },
    }),
    db.aptWallet.count({ where: { OR: [{ gold: { lt: 0 } }, { gems: { lt: 0 } }] } }),
    db.aptEconomyLog.count({
      where: { createdAt: { gte: start, lt: end }, action: "market_list" },
    }),
    db.aptEconomyLog.count({
      where: { createdAt: { gte: start, lt: end }, action: { contains: "cancel" } },
    }),
    db.aptMarketListing.count({
      where: { status: "SOLD", soldAt: { gte: start, lt: end } },
    }),
    db.aptWalletTransaction.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        currency: "gold",
        type: { in: ["live", "event"] },
        amount: { gt: 0 },
      },
      select: { amount: true, referenceId: true },
    }),
    db.aptNotification.count({ where: { createdAt: { gte: start, lt: end } } }),
    db.aptNotification.count({ where: { isRead: false } }),
    db.aptFraudProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    db.aptFraudScoreHistory.count({ where: { createdAt: { gte: start, lt: end } } }),
    db.aptEconomyOperation.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    db.aptEconomySnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
    db.aptEconomyRestoreLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.aptMarketPriceHistory.findMany({
      where: { soldAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { soldPrice: true },
      take: 500,
      orderBy: { soldAt: "desc" },
    }),
    db.aptEconomyCanaryHealthMetric.findFirst({ orderBy: { createdAt: "asc" } }),
    db.aptFraudProfile.count({ where: { riskScore: { gte: 70 } } }),
    db.aptIapRetryJob.count({ where: { status: "PENDING" } }),
    db.aptIapPurchase.count({
      where: {
        status: { in: ["VOIDED", "REFUNDED"] },
        voidedAt: { gte: start, lt: end },
      },
    }),
  ]);

  let goldCreated = 0;
  let goldBurned = 0;
  const refCounts = new Map<string, number>();
  for (const tx of goldTx) {
    if (tx.amount > 0) goldCreated += tx.amount;
    else goldBurned += Math.abs(tx.amount);
    if (tx.referenceId) {
      const k = `${tx.type}:${tx.referenceId}`;
      refCounts.set(k, (refCounts.get(k) ?? 0) + 1);
    }
  }
  let duplicateReference = 0;
  for (const c of refCounts.values()) {
    if (c > 1) duplicateReference += c - 1;
  }

  const marketHour = hourCounters("market");
  const marketErrors = marketHour.marketError ?? 0;
  const marketOps = marketHour.marketOp ?? 0;
  const marketErrorRate = marketOps > 0 ? marketErrors / marketOps : 0;

  const prices = priceHistory.map((p) => p.soldPrice).sort((a, b) => a - b);
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)]! : 0;
  const recentAvg =
    prices.length > 0
      ? prices.slice(0, 20).reduce((s, p) => s + p, 0) / Math.min(20, prices.length)
      : 0;
  const priceSpike = medianPrice > 0 ? Math.max(0, (recentAvg - medianPrice) / medianPrice) : 0;
  const priceCrash = medianPrice > 0 ? Math.max(0, (medianPrice - recentAvg) / medianPrice) : 0;

  const liveGold = liveGoldTx.reduce((s, t) => s + t.amount, 0);
  const liveRefs = new Map<string, number>();
  for (const t of liveGoldTx) {
    if (t.referenceId) liveRefs.set(t.referenceId, (liveRefs.get(t.referenceId) ?? 0) + 1);
  }
  let duplicateReward = 0;
  for (const c of liveRefs.values()) {
    if (c > 1) duplicateReward += c - 1;
  }

  const fraudMap = Object.fromEntries(fraudProfiles.map((f) => [f.status, f._count._all]));
  const fraudIncrease =
    baselineSnap && baselineSnap.fraudBaseline > 0
      ? (currentHighRisk - baselineSnap.fraudBaseline) / baselineSnap.fraudBaseline
      : 0;

  const netInflation =
    goldBurned > 0 ? (goldCreated - goldBurned) / goldBurned : goldCreated > 0 ? 1 : 0;

  return {
    wallet: {
      goldCreated,
      goldBurned,
      netInflation,
      negativeBalance: negativeWallets,
      walletErrors: hourCounters("wallet").walletError ?? 0,
      duplicateReference,
    },
    market: {
      listingSuccess: marketListLogs,
      listingAttempts: marketListLogs + (marketHour.listingError ?? 0),
      purchaseSuccess: soldToday,
      purchaseAttempts: soldToday + marketErrors,
      cancelSuccess: marketCancelLogs,
      medianPrice,
      priceSpike,
      priceCrash,
      duplicatePurchase: marketHour.duplicatePurchase ?? 0,
      marketErrorRate,
    },
    live: {
      goldReward: liveGold,
      dailyLimitHit: config.dailyLiveGoldLimit > 0 && liveGold >= config.dailyLiveGoldLimit ? 1 : 0,
      duplicateReward,
      rewardErrors: hourCounters("live").rewardError ?? 0,
    },
    notification: {
      generated: notificationsToday,
      delivered: notificationsToday,
      unread: unreadNotif,
      failures: hourCounters("notification").failure ?? 0,
      queue: unreadNotif,
    },
    fraud: {
      newWatch: fraudMap.WATCH ?? 0,
      newSuspicious: fraudMap.SUSPICIOUS ?? 0,
      newHighRisk: fraudMap.HIGH_RISK ?? fraudMap.HIGH ?? 0,
      freeze: fraudMap.FROZEN ?? 0,
      falsePositive: 0,
      detectionRate: fraudHistoryToday,
      fraudIncrease,
    },
    offline: {
      pendingOps,
      replayFailure: hourCounters("offline").replayFailure ?? 0,
      syncFailure: hourCounters("offline").syncFailure ?? 0,
      expiredPending: 0,
    },
    backup: {
      latestSnapshotAgeHours: latestSnapshot
        ? (Date.now() - latestSnapshot.createdAt.getTime()) / (60 * 60 * 1000)
        : 999,
      restoreSuccess: restoreLogs.filter((r) => !r.dryRun).length,
      restoreFailure: 0,
      checksumError: 0,
    },
    iap: {
      verifyFail: hourCounters("iap").verifyFail ?? 0,
      fulfillFail: hourCounters("iap").fulfillFail ?? 0,
      ackFail: hourCounters("iap").ackFail ?? 0,
      refund: iapRefundsToday,
      chargeback: hourCounters("iap").chargeback ?? 0,
      pendingQueue: iapPendingRetries,
    },
  };
}

export function getMetricValue(metrics: HealthMetrics, domain: string, metric: string): number {
  const d = metrics[domain as keyof HealthMetrics] as Record<string, number> | undefined;
  return d?.[metric] ?? 0;
}
