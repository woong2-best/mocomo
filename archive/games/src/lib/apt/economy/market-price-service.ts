import { db } from "@/lib/db";
import { getEconomyConfigFull } from "./config-service";

export async function recordMarketSale(
  stickerTypeId: string,
  soldPrice: number,
  listingId: string
): Promise<void> {
  await db.aptMarketPriceHistory.create({
    data: { stickerTypeId, soldPrice, listingId },
  });
}

export type MarketPriceStats = {
  stickerTypeId: string;
  avgPrice: number;
  lastPrice: number;
  sampleCount: number;
  changePercent: number | null;
};

export type PriceGuideStats = {
  stickerTypeId: string;
  recommended: number;
  avg: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  sampleCount: number;
  last24h: WindowStats;
  last7d: WindowStats;
  last30d: WindowStats;
};

type WindowStats = {
  avg: number;
  min: number;
  max: number;
  count: number;
  median: number;
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((a, v) => a + (v - avg) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

function windowStats(prices: number[]): WindowStats {
  if (!prices.length) {
    return { avg: 0, min: 0, max: 0, count: 0, median: 0 };
  }
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  return {
    avg,
    min: Math.min(...prices),
    max: Math.max(...prices),
    count: prices.length,
    median: median(prices),
  };
}

export async function getMarketPriceStats(
  stickerTypeId: string,
  sampleSize?: number
): Promise<MarketPriceStats | null> {
  const config = await getEconomyConfigFull();
  const size = sampleSize ?? config.recommendPriceWindow;
  const rows = await db.aptMarketPriceHistory.findMany({
    where: { stickerTypeId },
    orderBy: { soldAt: "desc" },
    take: size,
    select: { soldPrice: true },
  });
  if (!rows.length) return null;

  const prices = rows.map((r) => r.soldPrice);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const lastPrice = prices[0]!;
  const prevAvg =
    prices.length > 1
      ? Math.round(prices.slice(1).reduce((a, b) => a + b, 0) / (prices.length - 1))
      : null;
  const changePercent =
    prevAvg && prevAvg > 0
      ? Math.round(((lastPrice - prevAvg) / prevAvg) * 100)
      : null;

  return {
    stickerTypeId,
    avgPrice,
    lastPrice,
    sampleCount: prices.length,
    changePercent,
  };
}

export async function getPriceGuideStats(stickerTypeId: string): Promise<PriceGuideStats | null> {
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const rows = await db.aptMarketPriceHistory.findMany({
    where: { stickerTypeId, soldAt: { gte: since30 } },
    orderBy: { soldAt: "desc" },
    select: { soldPrice: true, soldAt: true },
  });
  if (!rows.length) return null;

  const allPrices = rows.map((r) => r.soldPrice);
  const avg = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
  const config = await getEconomyConfigFull();
  const recent = rows.slice(0, config.recommendPriceWindow).map((r) => r.soldPrice);
  const recommended = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);

  const since24 = new Date(now - 24 * 60 * 60 * 1000);
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

  return {
    stickerTypeId,
    recommended,
    avg,
    median: median(allPrices),
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
    stdDev: stdDev(allPrices, avg),
    sampleCount: allPrices.length,
    last24h: windowStats(rows.filter((r) => r.soldAt >= since24).map((r) => r.soldPrice)),
    last7d: windowStats(rows.filter((r) => r.soldAt >= since7).map((r) => r.soldPrice)),
    last30d: windowStats(allPrices),
  };
}

export function calcPriceDeviation(price: number, recommended: number | null): number | null {
  if (!recommended || recommended <= 0) return null;
  return Math.round(((price - recommended) / recommended) * 100);
}

export type ListingRiskBand = "normal" | "warn" | "danger" | "fraud";

export function listingRiskBand(
  deviationPercent: number | null,
  opts: { suspiciousFlag?: boolean; fraudScore?: number }
): ListingRiskBand {
  if (opts.suspiciousFlag || (opts.fraudScore ?? 0) >= 60) return "fraud";
  const d = Math.abs(deviationPercent ?? 0);
  if (d >= 50) return "danger";
  if (d >= 20) return "warn";
  return "normal";
}
