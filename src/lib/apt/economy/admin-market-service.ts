import { db } from "@/lib/db";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";
import { bondeeKindToStickerId } from "@/lib/apt/isometric/catalog-map";
import type { BondeeFurnitureKind } from "@/lib/apt/bondee/types";
import {
  calcPriceDeviation,
  getMarketPriceStats,
  getPriceGuideStats,
  listingRiskBand,
  type ListingRiskBand,
  type PriceGuideStats,
} from "./market-price-service";
import {
  getMarketAdminFlags,
  setMarketAdminFlags,
  type MarketAdminFlags,
} from "./market-admin-guards";
import { buildEconomyEventStream } from "./economy-event-stream";
import { mutateWalletInTx } from "./wallet-service";
import { atomicConsumeStorageInTx, atomicReturnStorageInTx } from "./storage-atomic";
import { writeEconomyLog } from "./economy-log-service";
import {
  adminFreezeUser,
  adminIgnoreFraudUser,
  adminUnfreezeUser,
} from "./fraud/admin-fraud-service";
import { getEconomyConfigFull } from "./config-service";

function listingStickerId(row: {
  stickerTypeId: string | null;
  itemKind: string;
}): string {
  if (row.stickerTypeId) return row.stickerTypeId;
  return bondeeKindToStickerId(row.itemKind as BondeeFurnitureKind);
}

async function writeMarketAdminLog(input: {
  adminId: string;
  listingId?: string | null;
  action: string;
  before?: string | null;
  after?: string | null;
  reason?: string | null;
}) {
  await db.aptMarketAdminLog.create({
    data: {
      adminId: input.adminId,
      listingId: input.listingId ?? null,
      action: input.action,
      before: input.before ?? null,
      after: input.after ?? null,
      reason: input.reason ?? null,
    },
  });
}

export type MarketDashboardKpi = {
  activeListings: number;
  todaySales: number;
  todayVolume: number;
  avgPrice: number;
  medianPrice: number;
  itemsSold: number;
  suspiciousListings: number;
  cancelledListings: number;
  marketHealth: number;
};

export type MarketListingRow = {
  id: string;
  sellerId: string;
  sellerName: string;
  buyerId: string | null;
  buyerName: string | null;
  itemId: string;
  itemLabel: string;
  priceGold: number;
  recommendedPrice: number | null;
  deviationPercent: number | null;
  riskBand: ListingRiskBand;
  createdAt: string;
  expiresAt: string | null;
  soldAt: string | null;
  viewCount: number;
  status: string;
  hiddenByAdmin: boolean;
  suspiciousFlag: boolean;
  fraudScore: number;
};

export type MarketAdminLogDto = {
  id: string;
  listingId: string | null;
  action: string;
  before: string | null;
  after: string | null;
  reason: string | null;
  adminName: string;
  createdAt: string;
};

export type MarketListingDetail = {
  listing: MarketListingRow;
  priceGuide: PriceGuideStats | null;
  priceHistory: { soldPrice: number; soldAt: string }[];
  seller: {
    userId: string;
    username: string;
    gold: number;
    gems: number;
    fraudScore: number;
    fraudStatus: string;
    linkedIpAccounts: number;
  };
  buyer: { userId: string; username: string } | null;
  marketReplay: { at: string; title: string; summary: string }[];
};

export type MarketAnalytics = {
  dailyVolume: { date: string; volume: number; sales: number }[];
  avgPriceTrend: { date: string; avg: number }[];
  successRate: number;
  avgTimeToSellHours: number;
  categoryVolume: { category: string; volume: number; count: number }[];
};

export type HotListingRow = {
  id: string;
  itemLabel: string;
  metric: string;
  value: number | string;
  priceGold: number;
};

function todayStartUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getMarketDashboardKpi(): Promise<MarketDashboardKpi> {
  const today = todayStartUtc();

  const [activeListings, soldToday, cancelledToday, suspiciousFlagCount, sellingRows] =
    await Promise.all([
      db.aptMarketListing.count({ where: { status: "SELLING", hiddenByAdmin: false } }),
      db.aptMarketListing.findMany({
        where: { status: "SOLD", soldAt: { gte: today } },
        select: { priceGold: true },
      }),
      db.aptMarketListing.count({
        where: { status: "CANCELLED", createdAt: { gte: today } },
      }),
      db.aptMarketListing.count({
        where: { status: "SELLING", suspiciousFlag: true },
      }),
      db.aptMarketListing.findMany({
        where: { status: "SELLING" },
        select: { sellerId: true, priceGold: true, stickerTypeId: true, itemKind: true, suspiciousFlag: true },
        take: 200,
      }),
    ]);

  const prices = soldToday.map((s) => s.priceGold);
  const todayVolume = prices.reduce((a, b) => a + b, 0);
  const avgPrice = prices.length ? Math.round(todayVolume / prices.length) : 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const medianPrice = sorted.length
    ? sorted.length % 2
      ? sorted[Math.floor(sorted.length / 2)]!
      : Math.round((sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2)
    : 0;

  let suspiciousListings = suspiciousFlagCount;
  const sellerIds = [...new Set(sellingRows.map((r) => r.sellerId))];
  const fraudProfiles = sellerIds.length
    ? await db.aptFraudProfile.findMany({
        where: { userId: { in: sellerIds } },
        select: { userId: true, riskScore: true },
      })
    : [];
  const fraudMap = new Map(fraudProfiles.map((f) => [f.userId, f.riskScore]));

  for (const row of sellingRows) {
    const sticker = listingStickerId(row);
    const stats = await getMarketPriceStats(sticker);
    const dev = calcPriceDeviation(row.priceGold, stats?.avgPrice ?? null);
    const band = listingRiskBand(dev, {
      suspiciousFlag: row.suspiciousFlag,
      fraudScore: fraudMap.get(row.sellerId),
    });
    if (band === "danger" || band === "fraud") suspiciousListings += 1;
  }

  const marketHealth = Math.max(
    0,
    Math.min(
      100,
      100 -
        Math.round((suspiciousListings / Math.max(1, activeListings)) * 40) -
        (cancelledToday > 10 ? 10 : 0)
    )
  );

  return {
    activeListings,
    todaySales: soldToday.length,
    todayVolume,
    avgPrice,
    medianPrice,
    itemsSold: soldToday.length,
    suspiciousListings,
    cancelledListings: cancelledToday,
    marketHealth,
  };
}

async function enrichListingRow(row: {
  id: string;
  sellerId: string;
  buyerId: string | null;
  stickerTypeId: string | null;
  itemKind: string;
  priceGold: number;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
  soldAt: Date | null;
  viewCount: number;
  hiddenByAdmin: boolean;
  suspiciousFlag: boolean;
  seller: { username: string; name: string | null };
  buyer?: { username: string; name: string | null } | null;
}): Promise<MarketListingRow> {
  const sticker = listingStickerId(row);
  const asset = STICKER_CATALOG[sticker];
  const stats = await getMarketPriceStats(sticker);
  const deviationPercent = calcPriceDeviation(row.priceGold, stats?.avgPrice ?? null);
  const fraud = await db.aptFraudProfile.findUnique({
    where: { userId: row.sellerId },
    select: { riskScore: true },
  });
  return {
    id: row.id,
    sellerId: row.sellerId,
    sellerName: row.seller.name ?? row.seller.username,
    buyerId: row.buyerId,
    buyerName: row.buyer ? row.buyer.name ?? row.buyer.username : null,
    itemId: sticker,
    itemLabel: asset?.label ?? sticker,
    priceGold: row.priceGold,
    recommendedPrice: stats?.avgPrice ?? null,
    deviationPercent,
    riskBand: listingRiskBand(deviationPercent, {
      suspiciousFlag: row.suspiciousFlag,
      fraudScore: fraud?.riskScore,
    }),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    soldAt: row.soldAt?.toISOString() ?? null,
    viewCount: row.viewCount,
    status: row.status,
    hiddenByAdmin: row.hiddenByAdmin,
    suspiciousFlag: row.suspiciousFlag,
    fraudScore: fraud?.riskScore ?? 0,
  };
}

export async function listMarketAdminListings(options?: {
  status?: string;
  limit?: number;
  query?: string;
}): Promise<MarketListingRow[]> {
  const limit = options?.limit ?? 60;
  const rows = await db.aptMarketListing.findMany({
    where: options?.status ? { status: options.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      seller: { select: { username: true, name: true } },
      buyer: { select: { username: true, name: true } },
    },
  });

  let enriched: MarketListingRow[] = [];
  for (const row of rows) {
    enriched.push(await enrichListingRow(row));
  }

  if (options?.query?.trim()) {
    const q = options.query.trim().toLowerCase();
    enriched = enriched.filter(
      (r) =>
        r.id.includes(q) ||
        r.sellerName.toLowerCase().includes(q) ||
        r.itemLabel.toLowerCase().includes(q) ||
        r.itemId.toLowerCase().includes(q)
    );
  }
  return enriched;
}

export async function getMarketListingDetail(listingId: string): Promise<MarketListingDetail | null> {
  const row = await db.aptMarketListing.findUnique({
    where: { id: listingId },
    include: {
      seller: { select: { username: true, name: true } },
      buyer: { select: { username: true, name: true } },
    },
  });
  if (!row) return null;

  const sticker = listingStickerId(row);
  const [listing, priceGuide, priceHistory, wallet, fraud, devices] = await Promise.all([
    enrichListingRow(row),
    getPriceGuideStats(sticker),
    db.aptMarketPriceHistory.findMany({
      where: { stickerTypeId: sticker },
      orderBy: { soldAt: "desc" },
      take: 30,
      select: { soldPrice: true, soldAt: true },
    }),
    db.aptWallet.findUnique({ where: { userId: row.sellerId } }),
    db.aptFraudProfile.findUnique({ where: { userId: row.sellerId } }),
    db.aptUserDevice.findMany({
      where: { userId: row.sellerId },
      select: { ip: true },
    }),
  ]);

  const ips = devices.map((d) => d.ip).filter(Boolean) as string[];
  let linkedIpAccounts = 0;
  if (ips.length) {
    const grouped = await db.aptUserDevice.groupBy({
      by: ["ip"],
      where: { ip: { in: ips } },
      _count: { userId: true },
    });
    linkedIpAccounts = Math.max(0, ...grouped.map((g) => g._count.userId));
  }

  const events = await buildEconomyEventStream(row.sellerId, { days: 30, limit: 200 });
  const marketReplay = events
    .filter((e) => e.category === "market" || e.referenceId === listingId)
    .map((e) => ({ at: e.at, title: e.title, summary: e.summary }));

  return {
    listing,
    priceGuide,
    priceHistory: priceHistory.map((p) => ({
      soldPrice: p.soldPrice,
      soldAt: p.soldAt.toISOString(),
    })),
    seller: {
      userId: row.sellerId,
      username: row.seller.username,
      gold: wallet?.gold ?? 0,
      gems: wallet?.gems ?? 0,
      fraudScore: fraud?.riskScore ?? 0,
      fraudStatus: fraud?.status ?? "NORMAL",
      linkedIpAccounts,
    },
    buyer: row.buyer
      ? { userId: row.buyerId!, username: row.buyer.username }
      : null,
    marketReplay,
  };
}

export async function getMarketAnalytics(): Promise<MarketAnalytics> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sold = await db.aptMarketListing.findMany({
    where: { status: "SOLD", soldAt: { gte: since } },
    select: {
      priceGold: true,
      soldAt: true,
      createdAt: true,
      stickerTypeId: true,
      itemKind: true,
    },
  });

  const byDay = new Map<string, { volume: number; sales: number; prices: number[] }>();
  let totalHours = 0;
  let sellCount = 0;

  for (const s of sold) {
    if (!s.soldAt) continue;
    const day = s.soldAt.toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { volume: 0, sales: 0, prices: [] };
    cur.volume += s.priceGold;
    cur.sales += 1;
    cur.prices.push(s.priceGold);
    byDay.set(day, cur);
    totalHours += (s.soldAt.getTime() - s.createdAt.getTime()) / (3600 * 1000);
    sellCount += 1;
  }

  const listed = await db.aptMarketListing.count({
    where: { createdAt: { gte: since } },
  });
  const successRate = listed > 0 ? Math.round((sold.length / listed) * 100) : 0;

  const categoryVolume = new Map<string, { volume: number; count: number }>();
  for (const s of sold) {
    const sticker = listingStickerId(s);
    const cat = STICKER_CATALOG[sticker]?.category ?? "other";
    const cur = categoryVolume.get(cat) ?? { volume: 0, count: 0 };
    cur.volume += s.priceGold;
    cur.count += 1;
    categoryVolume.set(cat, cur);
  }

  const dailyVolume = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, volume: v.volume, sales: v.sales }));

  const avgPriceTrend = dailyVolume.map((d) => {
    const day = byDay.get(d.date)!;
    const avg = day.prices.length
      ? Math.round(day.prices.reduce((a, b) => a + b, 0) / day.prices.length)
      : 0;
    return { date: d.date, avg };
  });

  return {
    dailyVolume,
    avgPriceTrend,
    successRate,
    avgTimeToSellHours: sellCount ? Math.round(totalHours / sellCount) : 0,
    categoryVolume: [...categoryVolume.entries()].map(([category, v]) => ({
      category,
      volume: v.volume,
      count: v.count,
    })),
  };
}

export async function getHotListings(): Promise<{
  topViews: HotListingRow[];
  fastSales: HotListingRow[];
  slowListings: HotListingRow[];
  priceSpikes: HotListingRow[];
}> {
  const [topViews, recentSold, slow, selling] = await Promise.all([
    db.aptMarketListing.findMany({
      where: { status: "SELLING" },
      orderBy: { viewCount: "desc" },
      take: 8,
      include: { seller: { select: { username: true } } },
    }),
    db.aptMarketListing.findMany({
      where: { status: "SOLD", soldAt: { not: null } },
      orderBy: { soldAt: "desc" },
      take: 30,
      select: { id: true, stickerTypeId: true, itemKind: true, priceGold: true, createdAt: true, soldAt: true },
    }),
    db.aptMarketListing.findMany({
      where: { status: "SELLING" },
      orderBy: { createdAt: "asc" },
      take: 8,
      include: { seller: { select: { username: true } } },
    }),
    db.aptMarketListing.findMany({
      where: { status: "SELLING" },
      take: 100,
      select: { id: true, stickerTypeId: true, itemKind: true, priceGold: true },
    }),
  ]);

  const fastSales = recentSold
    .filter((s) => s.soldAt)
    .map((s) => ({
      id: s.id,
      hours: (s.soldAt!.getTime() - s.createdAt.getTime()) / (3600 * 1000),
      sticker: listingStickerId(s),
      priceGold: s.priceGold,
    }))
    .sort((a, b) => a.hours - b.hours)
    .slice(0, 8);

  const priceSpikes: HotListingRow[] = [];
  for (const row of selling) {
    const sticker = listingStickerId(row);
    const stats = await getMarketPriceStats(sticker);
    const dev = calcPriceDeviation(row.priceGold, stats?.avgPrice ?? null);
    if (dev != null && Math.abs(dev) >= 30) {
      priceSpikes.push({
        id: row.id,
        itemLabel: STICKER_CATALOG[sticker]?.label ?? sticker,
        metric: "deviation",
        value: `${dev > 0 ? "+" : ""}${dev}%`,
        priceGold: row.priceGold,
      });
    }
  }
  priceSpikes.sort((a, b) => Math.abs(Number(String(b.value).replace("%", ""))) - Math.abs(Number(String(a.value).replace("%", ""))));

  return {
    topViews: topViews.map((r) => ({
      id: r.id,
      itemLabel: STICKER_CATALOG[listingStickerId(r)]?.label ?? listingStickerId(r),
      metric: "views",
      value: r.viewCount,
      priceGold: r.priceGold,
    })),
    fastSales: fastSales.map((s) => ({
      id: s.id,
      itemLabel: STICKER_CATALOG[s.sticker]?.label ?? s.sticker,
      metric: "hours_to_sell",
      value: `${Math.round(s.hours * 10) / 10}h`,
      priceGold: s.priceGold,
    })),
    slowListings: slow.map((r) => ({
      id: r.id,
      itemLabel: STICKER_CATALOG[listingStickerId(r)]?.label ?? listingStickerId(r),
      metric: "age",
      value: formatAge(r.createdAt),
      priceGold: r.priceGold,
    })),
    priceSpikes: priceSpikes.slice(0, 8),
  };
}

function formatAge(d: Date): string {
  const hours = (Date.now() - d.getTime()) / (3600 * 1000);
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export async function listMarketAdminLogs(limit = 40): Promise<MarketAdminLogDto[]> {
  const rows = await db.aptMarketAdminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, username: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    listingId: r.listingId,
    action: r.action,
    before: r.before,
    after: r.after,
    reason: r.reason,
    adminName: r.admin.name ?? r.admin.username,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listPriceGuideItems(limit = 30): Promise<
  { stickerTypeId: string; label: string; stats: PriceGuideStats | null }[]
> {
  const grouped = await db.aptMarketPriceHistory.groupBy({
    by: ["stickerTypeId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });
  const out = [];
  for (const g of grouped) {
    out.push({
      stickerTypeId: g.stickerTypeId,
      label: STICKER_CATALOG[g.stickerTypeId]?.label ?? g.stickerTypeId,
      stats: await getPriceGuideStats(g.stickerTypeId),
    });
  }
  return out;
}

export async function listNpcInterventions() {
  return db.aptMarketNpcIntervention.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function upsertNpcIntervention(input: {
  id?: string;
  stickerTypeId: string;
  mode: string;
  targetPrice?: number | null;
  maxQuantity?: number;
  enabled?: boolean;
}) {
  if (input.id) {
    return db.aptMarketNpcIntervention.update({
      where: { id: input.id },
      data: {
        stickerTypeId: input.stickerTypeId,
        mode: input.mode,
        targetPrice: input.targetPrice ?? null,
        maxQuantity: input.maxQuantity ?? 10,
        enabled: input.enabled ?? true,
      },
    });
  }
  return db.aptMarketNpcIntervention.create({
    data: {
      stickerTypeId: input.stickerTypeId,
      mode: input.mode,
      targetPrice: input.targetPrice ?? null,
      maxQuantity: input.maxQuantity ?? 10,
      enabled: input.enabled ?? true,
    },
  });
}

export async function deleteNpcIntervention(id: string) {
  await db.aptMarketNpcIntervention.delete({ where: { id } });
}

export async function getMarketAdminPageData() {
  const [kpi, listings, flags, logs, analytics, hot, priceGuide, npcRules] = await Promise.all([
    getMarketDashboardKpi(),
    listMarketAdminListings({ limit: 50 }),
    getMarketAdminFlags(),
    listMarketAdminLogs(30),
    getMarketAnalytics(),
    getHotListings(),
    listPriceGuideItems(20),
    listNpcInterventions(),
  ]);
  return { kpi, listings, flags, logs, analytics, hot, priceGuide, npcRules };
}

// ——— Admin Actions ———

export async function adminHideListing(
  listingId: string,
  adminId: string,
  reason: string,
  hide: boolean
): Promise<{ ok: true } | { error: string }> {
  const row = await db.aptMarketListing.findUnique({ where: { id: listingId } });
  if (!row) return { error: "Listing not found" };
  await db.aptMarketListing.update({
    where: { id: listingId },
    data: { hiddenByAdmin: hide },
  });
  await writeMarketAdminLog({
    adminId,
    listingId,
    action: hide ? "HIDE" : "UNHIDE",
    before: String(row.hiddenByAdmin),
    after: String(hide),
    reason,
  });
  return { ok: true };
}

export async function adminCancelListing(
  listingId: string,
  adminId: string,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  try {
    await db.$transaction(async (tx) => {
      const row = await tx.aptMarketListing.findUnique({ where: { id: listingId } });
      if (!row || row.status !== "SELLING") throw new Error("취소할 수 없는 상태입니다.");
      const updated = await tx.aptMarketListing.updateMany({
        where: { id: listingId, status: "SELLING" },
        data: { status: "CANCELLED" },
      });
      if (updated.count !== 1) throw new Error("이미 처리됨");
      const sticker = listingStickerId(row);
      const ok = await atomicReturnStorageInTx(tx, row.sellerId, sticker, 1);
      if (!ok) throw new Error("창고 반환 실패");
      await writeEconomyLog(tx, {
        userId: row.sellerId,
        action: "market_cancel",
        reason: `[Admin] ${reason}`,
        referenceId: listingId,
        referenceType: "AptMarketListing",
      });
    });
    await writeMarketAdminLog({
      adminId,
      listingId,
      action: "CANCEL",
      before: "SELLING",
      after: "CANCELLED",
      reason,
    });
    const row = await db.aptMarketListing.findUnique({
      where: { id: listingId },
      select: { sellerId: true, stickerTypeId: true, itemKind: true },
    });
    if (row) {
      const sticker = listingStickerId(row);
      const asset = STICKER_CATALOG[sticker];
      const { notifyMarketCancelled } = await import("./notification/economy-notify");
      notifyMarketCancelled({
        sellerId: row.sellerId,
        itemLabel: asset?.label ?? sticker,
        listingId,
        reason: `[운영] ${reason}`,
      });
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "취소 실패" };
  }
}

export async function adminUpdateListingPrice(
  listingId: string,
  adminId: string,
  priceGold: number,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  if (priceGold < 1) return { error: "가격은 1 이상" };
  const row = await db.aptMarketListing.findUnique({ where: { id: listingId } });
  if (!row || row.status !== "SELLING") return { error: "수정할 수 없음" };
  await db.aptMarketListing.update({ where: { id: listingId }, data: { priceGold } });
  await writeMarketAdminLog({
    adminId,
    listingId,
    action: "PRICE_UPDATE",
    before: String(row.priceGold),
    after: String(priceGold),
    reason,
  });
  return { ok: true };
}

export async function adminExtendListingExpiry(
  listingId: string,
  adminId: string,
  extraDays: number,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  const row = await db.aptMarketListing.findUnique({ where: { id: listingId } });
  if (!row) return { error: "Not found" };
  const base = row.expiresAt ?? new Date();
  const next = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);
  await db.aptMarketListing.update({ where: { id: listingId }, data: { expiresAt: next } });
  await writeMarketAdminLog({
    adminId,
    listingId,
    action: "EXTEND_EXPIRY",
    before: row.expiresAt?.toISOString() ?? "null",
    after: next.toISOString(),
    reason,
  });
  return { ok: true };
}

export async function adminFlagListingSuspicious(
  listingId: string,
  adminId: string,
  flag: boolean,
  reason: string
): Promise<{ ok: true }> {
  const row = await db.aptMarketListing.findUnique({ where: { id: listingId } });
  await db.aptMarketListing.update({
    where: { id: listingId },
    data: { suspiciousFlag: flag },
  });
  await writeMarketAdminLog({
    adminId,
    listingId,
    action: flag ? "FLAG_SUSPICIOUS" : "UNFLAG",
    before: String(row?.suspiciousFlag ?? false),
    after: String(flag),
    reason,
  });
  return { ok: true };
}

export async function adminNpcBuyListing(
  listingId: string,
  adminId: string,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  const config = await getEconomyConfigFull();
  try {
    await db.$transaction(async (tx) => {
      const row = await tx.aptMarketListing.findUnique({ where: { id: listingId } });
      if (!row || row.status !== "SELLING") throw new Error("매입 불가");
      const sticker = listingStickerId(row);
      const npcPrice = Math.max(1, Math.floor(row.priceGold * config.npcBuyRate));
      await tx.aptMarketListing.updateMany({
        where: { id: listingId, status: "SELLING" },
        data: { status: "CANCELLED", hiddenByAdmin: true },
      });
      await mutateWalletInTx(tx, {
        userId: row.sellerId,
        currency: "gold",
        amount: npcPrice,
        type: "admin",
        referenceId: `${listingId}:npc-buy`,
        referenceType: "AptMarketListing",
        memo: `[NPC 매입] ${sticker}`,
        idempotent: true,
      });
      await writeEconomyLog(tx, {
        userId: row.sellerId,
        action: "market_npc_buy",
        deltaGold: npcPrice,
        reason: `[Admin NPC] ${reason}`,
        referenceId: listingId,
        referenceType: "AptMarketListing",
      });
    });
    await writeMarketAdminLog({
      adminId,
      listingId,
      action: "NPC_BUY",
      after: "CANCELLED",
      reason,
    });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "NPC 매입 실패" };
  }
}

export async function adminRefundSoldListing(
  listingId: string,
  adminId: string,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  try {
    await db.$transaction(async (tx) => {
      const row = await tx.aptMarketListing.findUnique({ where: { id: listingId } });
      if (!row || row.status !== "SOLD" || !row.buyerId) throw new Error("환불 불가 상태");
      const sticker = listingStickerId(row);
      const config = await getEconomyConfigFull();
      const fee = Math.floor(row.priceGold * (row.fleaEventId ? config.defaultFleaFee : config.marketFee));
      const sellerProceeds = row.priceGold - fee;

      await mutateWalletInTx(tx, {
        userId: row.buyerId,
        currency: "gold",
        amount: row.priceGold,
        type: "admin",
        referenceId: `${listingId}:refund-buyer`,
        referenceType: "AptMarketListing",
        memo: `[환불] ${sticker}`,
        idempotent: true,
      });

      await mutateWalletInTx(tx, {
        userId: row.sellerId,
        currency: "gold",
        amount: -sellerProceeds,
        type: "admin",
        referenceId: `${listingId}:refund-seller`,
        referenceType: "AptMarketListing",
        memo: `[환불 회수] ${sticker}`,
        idempotent: true,
      });

      const consumed = await atomicConsumeStorageInTx(tx, row.buyerId, sticker, 1);
      if (!consumed) throw new Error("구매자 인벤토리에 아이템 없음");
      await atomicReturnStorageInTx(tx, row.sellerId, sticker, 1);

      await writeEconomyLog(tx, {
        userId: row.buyerId,
        action: "cs_admin_refund",
        deltaGold: row.priceGold,
        reason: `[Market Refund] ${reason}`,
        referenceId: listingId,
        referenceType: "AptMarketListing",
      });
    });
    await writeMarketAdminLog({
      adminId,
      listingId,
      action: "REFUND",
      reason,
    });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "환불 실패" };
  }
}

export async function adminUpdateMarketEmergency(
  adminId: string,
  flags: Partial<MarketAdminFlags>,
  reason: string
): Promise<MarketAdminFlags> {
  const prev = await getMarketAdminFlags();
  const next = await setMarketAdminFlags(adminId, flags);
  for (const key of Object.keys(next) as (keyof MarketAdminFlags)[]) {
    if (prev[key] !== next[key]) {
      await writeMarketAdminLog({
        adminId,
        action: `EMERGENCY_${key.toUpperCase()}`,
        before: String(prev[key]),
        after: String(next[key]),
        reason,
      });
    }
  }
  return next;
}

export {
  adminFreezeUser,
  adminUnfreezeUser,
  adminIgnoreFraudUser,
  getMarketAdminFlags,
};

export type { MarketAdminFlags, PriceGuideStats, ListingRiskBand };
