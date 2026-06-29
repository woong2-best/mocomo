import { db } from "@/lib/db";
import {
  ECONOMY_CONFIG_DEFAULTS,
  type EconomyConfigFull,
  type EconomyConfigValues,
  type PublicEconomyConfig,
  toLegacyConfigDto,
} from "./economy-config-types";
import type { AptEconomyConfigDto } from "./wallet-types";
import { getActiveCanary } from "./canary/canary-service";
import { mergeEconomyConfig, shouldApplyCanary } from "./canary/canary-resolve";

type ConfigRow = {
  version: number;
  publishedAt: Date | null;
  publishedBy: { name: string | null; username: string } | null;
} & EconomyConfigValues;

function rowToValues(row: Record<string, unknown>): EconomyConfigValues {
  return {
    goldPerGem: Number(row.goldPerGem ?? ECONOMY_CONFIG_DEFAULTS.goldPerGem),
    bonusRate: Number(row.bonusRate ?? ECONOMY_CONFIG_DEFAULTS.bonusRate),
    dailyGemExchangeLimit: Number(
      row.dailyGemExchangeLimit ?? ECONOMY_CONFIG_DEFAULTS.dailyGemExchangeLimit
    ),
    dailyGoldLimit: Number(row.dailyGoldLimit ?? ECONOMY_CONFIG_DEFAULTS.dailyGoldLimit),
    marketFee: Number(row.marketFee ?? ECONOMY_CONFIG_DEFAULTS.marketFee),
    npcBuyRate: Number(row.npcBuyRate ?? ECONOMY_CONFIG_DEFAULTS.npcBuyRate),
    npcSellRate: Number(row.npcSellRate ?? ECONOMY_CONFIG_DEFAULTS.npcSellRate),
    starterGold: Number(row.starterGold ?? ECONOMY_CONFIG_DEFAULTS.starterGold),
    liveGoldPerCheer: Number(row.liveGoldPerCheer ?? ECONOMY_CONFIG_DEFAULTS.liveGoldPerCheer),
    dailyLiveGoldLimit: Number(
      row.dailyLiveGoldLimit ?? ECONOMY_CONFIG_DEFAULTS.dailyLiveGoldLimit
    ),
    liveWatchGoldPerMin: Number(
      row.liveWatchGoldPerMin ?? ECONOMY_CONFIG_DEFAULTS.liveWatchGoldPerMin
    ),
    dailyWatchGoldLimit: Number(
      row.dailyWatchGoldLimit ?? ECONOMY_CONFIG_DEFAULTS.dailyWatchGoldLimit
    ),
    dailyMissionReward: Number(
      row.dailyMissionReward ?? ECONOMY_CONFIG_DEFAULTS.dailyMissionReward
    ),
    weeklyMissionReward: Number(
      row.weeklyMissionReward ?? ECONOMY_CONFIG_DEFAULTS.weeklyMissionReward
    ),
    featuredRefreshHour: Number(
      row.featuredRefreshHour ?? ECONOMY_CONFIG_DEFAULTS.featuredRefreshHour
    ),
    newItemDays: Number(row.newItemDays ?? ECONOMY_CONFIG_DEFAULTS.newItemDays),
    discountDefaultRate: Number(
      row.discountDefaultRate ?? ECONOMY_CONFIG_DEFAULTS.discountDefaultRate
    ),
    recommendPriceWindow: Number(
      row.recommendPriceWindow ?? ECONOMY_CONFIG_DEFAULTS.recommendPriceWindow
    ),
    maxListingDays: Number(row.maxListingDays ?? ECONOMY_CONFIG_DEFAULTS.maxListingDays),
    priceHistoryDays: Number(row.priceHistoryDays ?? ECONOMY_CONFIG_DEFAULTS.priceHistoryDays),
    defaultFleaFee: Number(row.defaultFleaFee ?? ECONOMY_CONFIG_DEFAULTS.defaultFleaFee),
    defaultFleaDiscount: Number(
      row.defaultFleaDiscount ?? ECONOMY_CONFIG_DEFAULTS.defaultFleaDiscount
    ),
    fleaEventCooldownHrs: Number(
      row.fleaEventCooldownHrs ?? ECONOMY_CONFIG_DEFAULTS.fleaEventCooldownHrs
    ),
    pendingExpireDays: Number(row.pendingExpireDays ?? ECONOMY_CONFIG_DEFAULTS.pendingExpireDays),
    maxOfflineOps: Number(row.maxOfflineOps ?? ECONOMY_CONFIG_DEFAULTS.maxOfflineOps),
    emergencyMode: Boolean(row.emergencyMode ?? false),
    fraudRestrictScore: Number(row.fraudRestrictScore ?? 70),
    fraudMarketBlockScore: Number(row.fraudMarketBlockScore ?? 90),
    fraudLiveBlockScore: Number(row.fraudLiveBlockScore ?? 95),
  };
}

function toFull(row: ConfigRow): EconomyConfigFull {
  const values = rowToValues(row);
  return {
    ...values,
    version: row.version,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishedByName: row.publishedBy?.name ?? row.publishedBy?.username ?? null,
  };
}

export async function getEconomyConfigFull(): Promise<EconomyConfigFull> {
  const row = await db.aptEconomyConfig.findUnique({
    where: { id: "default" },
    include: { publishedBy: { select: { name: true, username: true } } },
  });
  if (!row) {
    return {
      ...ECONOMY_CONFIG_DEFAULTS,
      version: 1,
      publishedAt: null,
      publishedByName: null,
    };
  }
  return toFull(row as ConfigRow);
}

/** 사용자별 Canary 적용 Config — Operator → Tester → % → Published */
export async function resolveEconomyConfigForUser(userId: string): Promise<EconomyConfigFull> {
  const published = await getEconomyConfigFull();
  const canary = await getActiveCanary("CONFIG", "default");
  if (!canary) return published;
  if (!shouldApplyCanary(userId, canary)) return published;
  const draft = canary.draftPayload as Partial<EconomyConfigValues>;
  return mergeEconomyConfig(published, draft);
}

/** @deprecated userId 없을 때만 — 가능하면 resolveEconomyConfigForUser 사용 */

/** 서버 내부 — 레거시 호환 */
export async function getEconomyConfig(): Promise<AptEconomyConfigDto> {
  const full = await getEconomyConfigFull();
  return toLegacyConfigDto(full);
}

export async function getPublicEconomyConfig(): Promise<PublicEconomyConfig> {
  const full = await getEconomyConfigFull();
  const { version, publishedAt, ...values } = full;
  return { ...values, version, publishedAt };
}

export async function ensureEconomyConfig(): Promise<AptEconomyConfigDto> {
  await db.aptEconomyConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...ECONOMY_CONFIG_DEFAULTS,
      version: 1,
      publishedAt: new Date(),
    },
    update: {},
  });
  return getEconomyConfig();
}

export async function isEconomyEmergencyMode(): Promise<boolean> {
  const row = await db.aptEconomyConfig.findUnique({
    where: { id: "default" },
    select: { emergencyMode: true },
  });
  return row?.emergencyMode ?? false;
}

export function getConfigValues(full: EconomyConfigFull): EconomyConfigValues {
  const {
    version: _v,
    publishedAt: _p,
    publishedByName: _n,
    ...values
  } = full;
  return values;
}

export async function countGemsExchangedToday(userId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const rows = await db.aptWalletTransaction.findMany({
    where: {
      userId,
      type: "exchange",
      currency: "gems",
      amount: { lt: 0 },
      createdAt: { gte: start },
    },
    select: { amount: true },
  });
  return rows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
}
