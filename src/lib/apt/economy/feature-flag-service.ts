import { db } from "@/lib/db";
import {
  ECONOMY_FEATURE_DEFAULTS,
  type EconomyFeatureFlags,
  type EconomyFeatureKey,
  flagKeyToField,
} from "./feature-flag-types";
import { getActiveCanary } from "./canary/canary-service";
import { shouldApplyCanary } from "./canary/canary-resolve";

let cache: { flags: EconomyFeatureFlags; at: number } | null = null;
const CACHE_MS = 2_000;

export function invalidateFeatureFlagCache(): void {
  cache = null;
}

function rowToFlags(row: {
  shopEnabled: boolean;
  marketEnabled: boolean;
  liveEnabled: boolean;
  missionEnabled: boolean;
  notificationEnabled: boolean;
  fleaEnabled: boolean;
  iapEnabled: boolean;
  updatedAt: Date;
  updatedBy: { name: string | null; username: string } | null;
}): EconomyFeatureFlags {
  return {
    shopEnabled: row.shopEnabled,
    marketEnabled: row.marketEnabled,
    liveEnabled: row.liveEnabled,
    missionEnabled: row.missionEnabled,
    notificationEnabled: row.notificationEnabled,
    fleaEnabled: row.fleaEnabled,
    iapEnabled: row.iapEnabled,
    updatedAt: row.updatedAt.toISOString(),
    updatedByName: row.updatedBy?.name ?? row.updatedBy?.username ?? null,
  };
}

export async function ensureEconomyFeatureFlags(): Promise<EconomyFeatureFlags> {
  const row = await db.aptEconomyFeatureFlag.upsert({
    where: { id: "default" },
    create: { id: "default", ...ECONOMY_FEATURE_DEFAULTS },
    update: {},
    include: { updatedBy: { select: { name: true, username: true } } },
  });
  return rowToFlags(row);
}

export async function getEconomyFeatureFlags(): Promise<EconomyFeatureFlags> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.flags;
  }
  const row = await db.aptEconomyFeatureFlag.findUnique({
    where: { id: "default" },
    include: { updatedBy: { select: { name: true, username: true } } },
  });
  const flags = row
    ? rowToFlags(row)
    : {
        ...ECONOMY_FEATURE_DEFAULTS,
        updatedAt: new Date().toISOString(),
        updatedByName: null,
      };
  cache = { flags, at: Date.now() };
  return flags;
}

export async function resolveFeatureFlagsForUser(userId: string): Promise<EconomyFeatureFlags> {
  const published = await getEconomyFeatureFlags();
  const canary = await getActiveCanary("FEATURE_FLAG", "default");
  if (!canary || !shouldApplyCanary(userId, canary)) return published;
  const draft = canary.draftPayload as Partial<EconomyFeatureFlags>;
  return { ...published, ...draft };
}

export async function isEconomyFeatureEnabledForUser(
  userId: string,
  key: EconomyFeatureKey
): Promise<boolean> {
  const flags = await resolveFeatureFlagsForUser(userId);
  return flags[flagKeyToField(key)];
}

export async function isEconomyFeatureEnabled(key: EconomyFeatureKey): Promise<boolean> {
  const flags = await getEconomyFeatureFlags();
  return flags[flagKeyToField(key)];
}
