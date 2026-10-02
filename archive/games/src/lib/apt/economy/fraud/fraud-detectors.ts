import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { FraudRuleCode, FraudRuleHit } from "./fraud-types";
import type { FraudRuleConfig } from "./fraud-rule-thresholds";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 장터 자전거래 가속 차단 — 24h 내 동일 쌍 양방향 합 3건 이상 시 거절 */
export async function assertNoWashTradeAtPurchase(
  tx: Prisma.TransactionClient,
  buyerId: string,
  sellerId: string
): Promise<void> {
  const since = new Date(Date.now() - DAY_MS);
  const [soldToSeller, boughtFromSeller] = await Promise.all([
    tx.aptMarketListing.count({
      where: {
        sellerId: buyerId,
        buyerId: sellerId,
        status: "SOLD",
        soldAt: { gte: since },
      },
    }),
    tx.aptMarketListing.count({
      where: {
        sellerId: sellerId,
        buyerId: buyerId,
        status: "SOLD",
        soldAt: { gte: since },
      },
    }),
  ]);
  if (
    soldToSeller > 0 &&
    boughtFromSeller > 0 &&
    soldToSeller + boughtFromSeller >= 3
  ) {
    throw new Error("동일 상대와의 반복 거래는 제한됩니다.");
  }
}

export async function detectSelfMarket(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const minCycles = threshold.minCycles ?? 2;
  const since = new Date(Date.now() - 7 * DAY_MS);
  const sold = await db.aptMarketListing.findMany({
    where: { sellerId: userId, status: "SOLD", soldAt: { gte: since }, buyerId: { not: null } },
    select: { buyerId: true },
  });
  const bought = await db.aptMarketListing.findMany({
    where: { buyerId: userId, status: "SOLD", soldAt: { gte: since } },
    select: { sellerId: true },
  });

  const soldTo = new Map<string, number>();
  for (const s of sold) {
    if (!s.buyerId) continue;
    soldTo.set(s.buyerId, (soldTo.get(s.buyerId) ?? 0) + 1);
  }
  let cycles = 0;
  const partners: string[] = [];
  for (const b of bought) {
    const back = soldTo.get(b.sellerId) ?? 0;
    if (back > 0) {
      cycles += 1;
      partners.push(b.sellerId);
    }
  }
  if (cycles < minCycles) return null;
  return {
    rule: "SELF_MARKET",
    score: 0,
    evidence: { cycles, minCycles, partners: [...new Set(partners)].slice(0, 5) },
  };
}

export async function detectMultiAccount(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const minLinked = threshold.minLinkedAccounts ?? 5;
  const devices = await db.aptUserDevice.findMany({
    where: { userId },
    select: { fingerprint: true, ip: true },
  });
  if (!devices.length) return null;

  const fps = devices.map((d) => d.fingerprint);
  const ips = devices.map((d) => d.ip).filter(Boolean) as string[];

  const [byFp, byIp] = await Promise.all([
    db.aptUserDevice.groupBy({
      by: ["fingerprint"],
      where: { fingerprint: { in: fps } },
      _count: { userId: true },
    }),
    ips.length
      ? db.aptUserDevice.groupBy({
          by: ["ip"],
          where: { ip: { in: ips } },
          _count: { userId: true },
        })
      : Promise.resolve([]),
  ]);

  const maxFp = Math.max(0, ...byFp.map((g) => g._count.userId));
  const maxIp = Math.max(0, ...byIp.map((g) => g._count.userId));
  const linked = Math.max(maxFp, maxIp);
  if (linked < minLinked) return null;

  return {
    rule: "MULTI_ACCOUNT",
    score: 0,
    evidence: { linkedAccounts: linked, minLinkedAccounts: minLinked, fingerprints: fps.length, ips: ips.length },
  };
}

export async function detectGoldSpike(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const minTodayGold = threshold.minTodayGold ?? 5000;
  const spikeMultiplier = threshold.spikeMultiplier ?? 10;
  const minWithoutAvg = threshold.minWithoutAvg ?? 10000;

  const now = Date.now();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now - 7 * DAY_MS);

  const [todayTx, weekTx] = await Promise.all([
    db.aptWalletTransaction.findMany({
      where: { userId, currency: "gold", amount: { gt: 0 }, createdAt: { gte: todayStart } },
      select: { amount: true },
    }),
    db.aptWalletTransaction.findMany({
      where: { userId, currency: "gold", amount: { gt: 0 }, createdAt: { gte: weekStart, lt: todayStart } },
      select: { amount: true },
    }),
  ]);

  const todayGold = todayTx.reduce((a, t) => a + t.amount, 0);
  const weekDays = Math.max(1, Math.floor((todayStart.getTime() - weekStart.getTime()) / DAY_MS));
  const avgDaily =
    weekTx.length > 0 ? weekTx.reduce((a, t) => a + t.amount, 0) / weekDays : 0;

  if (todayGold < minTodayGold) return null;
  if (avgDaily > 0 && todayGold < avgDaily * spikeMultiplier) return null;
  if (avgDaily === 0 && todayGold < minWithoutAvg) return null;

  return {
    rule: "GOLD_SPIKE",
    score: 0,
    evidence: { todayGold, avgDaily: Math.round(avgDaily), minTodayGold, spikeMultiplier },
  };
}

export async function detectPriceManipulation(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const minListings = threshold.minListings ?? 3;
  const priceRatio = threshold.priceRatio ?? 50;
  const since = new Date(Date.now() - DAY_MS);
  const listings = await db.aptMarketListing.findMany({
    where: { sellerId: userId, createdAt: { gte: since } },
    select: { stickerTypeId: true, priceGold: true, itemKind: true },
    orderBy: { createdAt: "asc" },
  });
  if (listings.length < minListings) return null;

  const byItem = new Map<string, number[]>();
  for (const l of listings) {
    const key = l.stickerTypeId ?? l.itemKind;
    const arr = byItem.get(key) ?? [];
    arr.push(l.priceGold);
    byItem.set(key, arr);
  }

  for (const [item, prices] of byItem) {
    if (prices.length < 2) continue;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min > 0 && max / min >= priceRatio) {
      return {
        rule: "PRICE_MANIPULATION",
        score: 0,
        evidence: { item, min, max, ratio: Math.round(max / min), priceRatio },
      };
    }
  }
  return null;
}

export async function detectLiveFarm(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const minTxCount = threshold.minTxCount ?? 30;
  const minTotalGold = threshold.minTotalGold ?? 2000;
  const since = new Date(Date.now() - DAY_MS);
  const rows = await db.aptWalletTransaction.findMany({
    where: {
      userId,
      type: { in: ["live", "event"] },
      currency: "gold",
      amount: { gt: 0 },
      createdAt: { gte: since },
    },
    select: { amount: true },
  });
  const total = rows.reduce((a, r) => a + r.amount, 0);
  if (rows.length < minTxCount && total < minTotalGold) return null;
  return {
    rule: "LIVE_FARM",
    score: 0,
    evidence: { txCount: rows.length, totalGold: total, minTxCount, minTotalGold },
  };
}

export async function detectOfflineSpam(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const minOps = threshold.minOps ?? 200;
  const since = new Date(Date.now() - DAY_MS);
  const count = await db.aptEconomyOperation.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (count < minOps) return null;
  return {
    rule: "OFFLINE_SPAM",
    score: 0,
    evidence: { opsToday: count, minOps },
  };
}

export async function detectImpossiblePlay(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const windowMinutes = threshold.windowMinutes ?? 5;
  const minTxInWindow = threshold.minTxInWindow ?? 80;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const count = await db.aptWalletTransaction.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (count < minTxInWindow) return null;
  return {
    rule: "IMPOSSIBLE_PLAY",
    score: 0,
    evidence: { txInWindow: count, windowMinutes, minTxInWindow },
  };
}

export async function detectMarketLoop(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const minSoldCount = threshold.minSoldCount ?? 3;
  const maxUniqueBuyers = threshold.maxUniqueBuyers ?? 2;
  const minReverse = threshold.minReverse ?? 2;
  const since = new Date(Date.now() - 3 * DAY_MS);
  const sold = await db.aptMarketListing.findMany({
    where: { sellerId: userId, status: "SOLD", soldAt: { gte: since }, buyerId: { not: null } },
    select: { buyerId: true },
  });
  const buyers = sold.map((s) => s.buyerId!).filter(Boolean);
  if (buyers.length < minSoldCount) return null;

  const uniqueBuyers = new Set(buyers);
  if (uniqueBuyers.size > maxUniqueBuyers) return null;

  const partner = [...uniqueBuyers][0]!;
  const reverse = await db.aptMarketListing.count({
    where: {
      sellerId: partner,
      buyerId: userId,
      status: "SOLD",
      soldAt: { gte: since },
    },
  });
  if (reverse < minReverse) return null;

  return {
    rule: "MARKET_LOOP",
    score: 0,
    evidence: { partner, soldCount: buyers.length, reverse, minReverse },
  };
}

export async function detectRapidActivity(
  userId: string,
  threshold: Record<string, number>
): Promise<FraudRuleHit | null> {
  const windowMinutes = threshold.windowMinutes ?? 15;
  const minTotalActivity = threshold.minTotalActivity ?? 40;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const [tx, ops, listings] = await Promise.all([
    db.aptWalletTransaction.count({ where: { userId, createdAt: { gte: since } } }),
    db.aptEconomyOperation.count({ where: { userId, createdAt: { gte: since } } }),
    db.aptMarketListing.count({ where: { sellerId: userId, createdAt: { gte: since } } }),
  ]);
  const total = tx + ops + listings;
  if (total < minTotalActivity) return null;
  return {
    rule: "RAPID_LOGIN",
    score: 0,
    evidence: { tx, ops, listings, total, minTotalActivity, windowMinutes },
  };
}

type DetectorFn = (
  userId: string,
  threshold: Record<string, number>
) => Promise<FraudRuleHit | null>;

const DETECTORS: Record<FraudRuleCode, DetectorFn> = {
  SELF_MARKET: detectSelfMarket,
  MULTI_ACCOUNT: detectMultiAccount,
  GOLD_SPIKE: detectGoldSpike,
  PRICE_MANIPULATION: detectPriceManipulation,
  LIVE_FARM: detectLiveFarm,
  OFFLINE_SPAM: detectOfflineSpam,
  IMPOSSIBLE_PLAY: detectImpossiblePlay,
  MARKET_LOOP: detectMarketLoop,
  RAPID_LOGIN: detectRapidActivity,
  IAP_REPLAY: async () => null,
  TOKEN_REUSE: async () => null,
  CHARGEBACK: async () => null,
  REFUND_ABUSE: async () => null,
};

export async function runFraudDetectors(
  userId: string,
  rules: FraudRuleConfig[]
): Promise<FraudRuleHit[]> {
  const hits: FraudRuleHit[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const fn = DETECTORS[rule.id];
    if (!fn) continue;
    const hit = await fn(userId, rule.threshold);
    if (hit) {
      hits.push({ ...hit, score: rule.weight });
    }
  }
  return hits;
}
