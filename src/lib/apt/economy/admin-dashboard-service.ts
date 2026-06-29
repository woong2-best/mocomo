import { db } from "@/lib/db";
import { getEconomyConfigFull } from "./config-service";
import { getEconomyFeatureFlags } from "./feature-flag-service";
import {
  FEATURE_FLAG_LABELS,
  type EconomyFeatureKey,
  flagKeyToField,
} from "./feature-flag-types";

export type HealthStatus = "green" | "yellow" | "red";

export type EconomyHealthItem = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

export type EconomyDashboardStats = {
  goldSupply: number;
  gemSupply: number;
  walletTxToday: number;
  marketSalesToday: number;
  marketVolumeToday: number;
  goldCreatedToday: number;
  goldDestroyedToday: number;
  activeListings: number;
  newUsersToday: number;
  health: EconomyHealthItem[];
  dailyHistory: {
    date: string;
    goldCreated: number;
    goldDestroyed: number;
    marketVolume: number;
    marketSales: number;
    newUsers: number;
    activeUsers: number;
  }[];
};

/** KST 기준 오늘 00:00 ~ 내일 00:00 (UTC Date) */
export function getKstDayBounds(base = new Date()): { start: Date; end: Date } {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kst = new Date(base.getTime() + kstOffsetMs);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - kstOffsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function healthFromRatio(ratio: number, greenMax: number, yellowMax: number): HealthStatus {
  if (ratio <= greenMax) return "green";
  if (ratio <= yellowMax) return "yellow";
  return "red";
}

async function computeHealth(input: {
  goldCreated: number;
  goldDestroyed: number;
  marketSalesToday: number;
  marketSalesAvg7d: number;
  listingPriceDeviation: number | null;
  liveGoldToday: number;
  dailyLiveLimit: number;
  suspiciousCount: number;
}): Promise<EconomyHealthItem[]> {
  const netGold = input.goldCreated - input.goldDestroyed;
  const inflationRatio =
    input.goldDestroyed > 0
      ? input.goldCreated / input.goldDestroyed
      : input.goldCreated > 0
        ? 2
        : 1;

  let goldInflation: HealthStatus = "green";
  let goldDetail = `순유입 ${netGold.toLocaleString()}G`;
  if (netGold > 50_000) {
    goldInflation = "red";
    goldDetail = `과다 발행 ${netGold.toLocaleString()}G`;
  } else if (netGold > 10_000 || inflationRatio > 1.5) {
    goldInflation = "yellow";
    goldDetail = `발행 ${input.goldCreated.toLocaleString()}G / 소멸 ${input.goldDestroyed.toLocaleString()}G`;
  }

  const marketRatio =
    input.marketSalesAvg7d > 0
      ? input.marketSalesToday / input.marketSalesAvg7d
      : input.marketSalesToday > 0
        ? 1
        : 0;
  const marketStatus: HealthStatus =
    input.marketSalesToday === 0
      ? input.marketSalesAvg7d > 0
        ? "yellow"
        : "green"
      : marketRatio < 0.3
        ? "yellow"
        : "green";

  let listingStatus: HealthStatus = "green";
  let listingDetail = "가격 정상";
  if (input.listingPriceDeviation != null) {
    if (input.listingPriceDeviation > 0.6) {
      listingStatus = "red";
      listingDetail = `평균 대비 +${Math.round(input.listingPriceDeviation * 100)}%`;
    } else if (input.listingPriceDeviation > 0.35) {
      listingStatus = "yellow";
      listingDetail = `평균 대비 +${Math.round(input.listingPriceDeviation * 100)}%`;
    } else if (input.listingPriceDeviation < -0.35) {
      listingStatus = "yellow";
      listingDetail = `평균 대비 ${Math.round(input.listingPriceDeviation * 100)}%`;
    }
  }

  const liveRatio =
    input.dailyLiveLimit > 0 ? input.liveGoldToday / input.dailyLiveLimit : 0;
  const liveStatus = healthFromRatio(liveRatio, 0.5, 0.85);

  const suspiciousStatus: HealthStatus =
    input.suspiciousCount >= 5 ? "red" : input.suspiciousCount >= 1 ? "yellow" : "green";

  return [
    { id: "inflation", label: "Gold Inflation", status: goldInflation, detail: goldDetail },
    {
      id: "market",
      label: "Market Activity",
      status: marketStatus,
      detail: `오늘 ${input.marketSalesToday}건 (7일 평균 ${Math.round(input.marketSalesAvg7d)}/일)`,
    },
    {
      id: "listing_price",
      label: "Listing Price",
      status: listingStatus,
      detail: listingDetail,
    },
    {
      id: "live",
      label: "Live Reward",
      status: liveStatus,
      detail: `오늘 ${input.liveGoldToday.toLocaleString()}G / 한도 ${input.dailyLiveLimit.toLocaleString()}G`,
    },
    {
      id: "suspicious",
      label: "Suspicious Accounts",
      status: suspiciousStatus,
      detail:
        input.suspiciousCount > 0
          ? `${input.suspiciousCount}명 이상 거래`
          : "이상 없음",
    },
  ];
}

export async function loadEconomyDashboard(): Promise<EconomyDashboardStats> {
  const { start, end } = getKstDayBounds();

  const [
    supplyAgg,
    walletTxToday,
    marketToday,
    activeListings,
    newUsersToday,
    goldFlows,
    liveGoldToday,
    suspiciousRows,
    marketSales7d,
    listingAvg,
    historyAvg,
    config,
    dailyHistory,
  ] = await Promise.all([
    db.aptWallet.aggregate({ _sum: { gold: true, gems: true } }),
    db.aptWalletTransaction.count({
      where: { createdAt: { gte: start, lt: end } },
    }),
    db.aptMarketListing.findMany({
      where: { status: "SOLD", soldAt: { gte: start, lt: end } },
      select: { priceGold: true },
    }),
    db.aptMarketListing.count({ where: { status: "SELLING", priceGold: { gt: 0 } } }),
    db.user.count({ where: { createdAt: { gte: start, lt: end } } }),
    db.aptWalletTransaction.findMany({
      where: { currency: "gold", createdAt: { gte: start, lt: end } },
      select: { amount: true },
    }),
    db.aptWalletTransaction.aggregate({
      where: {
        currency: "gold",
        type: "live",
        amount: { gt: 0 },
        createdAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    db.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::bigint AS cnt FROM (
        SELECT "userId"
        FROM "AptWalletTransaction"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY "userId"
        HAVING COUNT(*) > 80 OR SUM(ABS("amount")) > 100000
      ) t
    `,
    db.aptMarketListing.count({
      where: {
        status: "SOLD",
        soldAt: { gte: new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000), lt: end },
      },
    }),
    db.aptMarketListing.aggregate({
      where: { status: "SELLING", priceGold: { gt: 0 } },
      _avg: { priceGold: true },
    }),
    db.aptMarketPriceHistory.aggregate({
      _avg: { soldPrice: true },
    }),
    db.aptEconomyConfig.findUnique({ where: { id: "default" } }),
    db.aptEconomyDailyStat.findMany({
      orderBy: { date: "desc" },
      take: 14,
    }),
  ]);

  const goldCreatedToday = goldFlows.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const goldDestroyedToday = goldFlows
    .filter((t) => t.amount < 0)
    .reduce((a, t) => a + -t.amount, 0);

  const marketVolumeToday = marketToday.reduce((a, m) => a + m.priceGold, 0);
  const marketSalesAvg7d = marketSales7d / 7;

  const avgListing = listingAvg._avg.priceGold ?? 0;
  const avgSold = historyAvg._avg.soldPrice ?? 0;
  const listingPriceDeviation =
    avgSold > 0 && avgListing > 0 ? (avgListing - avgSold) / avgSold : null;

  const suspiciousCount = Number(suspiciousRows[0]?.cnt ?? 0);
  const dailyLiveLimit = config?.dailyLiveGoldLimit ?? 5000;

  const health = await computeHealth({
    goldCreated: goldCreatedToday,
    goldDestroyed: goldDestroyedToday,
    marketSalesToday: marketToday.length,
    marketSalesAvg7d,
    listingPriceDeviation,
    liveGoldToday: liveGoldToday._sum.amount ?? 0,
    dailyLiveLimit,
    suspiciousCount,
  });

  const featureFlags = await getEconomyFeatureFlags();
  const flagKeys: EconomyFeatureKey[] = [
    "shop",
    "market",
    "live",
    "mission",
    "notification",
    "flea",
    "iap",
  ];
  for (const key of flagKeys) {
    const on = featureFlags[flagKeyToField(key)];
    if (!on) {
      health.unshift({
        id: `flag_${key}`,
        label: `${FEATURE_FLAG_LABELS[key]} Flag`,
        status: "red",
        detail: "OFF — Kill Switch 활성",
      });
    }
  }
  if (config?.emergencyMode) {
    health.unshift({
      id: "emergency",
      label: "Emergency Mode",
      status: "red",
      detail: "전체 경제 기능 차단 중",
    });
  }

  return {
    goldSupply: supplyAgg._sum.gold ?? 0,
    gemSupply: supplyAgg._sum.gems ?? 0,
    walletTxToday,
    marketSalesToday: marketToday.length,
    marketVolumeToday,
    goldCreatedToday,
    goldDestroyedToday,
    activeListings,
    newUsersToday,
    health,
    dailyHistory: dailyHistory
      .slice()
      .reverse()
      .map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        goldCreated: row.goldCreated,
        goldDestroyed: row.goldDestroyed,
        marketVolume: row.marketVolume,
        marketSales: row.marketSales,
        newUsers: row.newUsers,
        activeUsers: row.activeUsers,
      })),
  };
}
