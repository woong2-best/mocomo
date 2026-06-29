import { db } from "@/lib/db";
import {
  FEATURE_FLAG_LABELS,
  type EconomyFeatureFlags,
  type EconomyFeatureKey,
  ECONOMY_FEATURE_DEFAULTS,
  flagKeyToField,
} from "./feature-flag-types";
import {
  ensureEconomyFeatureFlags,
  getEconomyFeatureFlags,
  invalidateFeatureFlagCache,
} from "./feature-flag-service";

export type FeatureFlagLogDto = {
  id: string;
  feature: string;
  before: string;
  after: string;
  reason: string | null;
  adminName: string;
  createdAt: string;
};

async function writeFlagLog(input: {
  adminId: string;
  feature: string;
  before: string;
  after: string;
  reason?: string | null;
  ip?: string | null;
}) {
  await db.aptEconomyFeatureFlagLog.create({
    data: {
      adminId: input.adminId,
      feature: input.feature,
      before: input.before,
      after: input.after,
      reason: input.reason ?? null,
      ip: input.ip ?? null,
    },
  });
}

export async function listFeatureFlagLogs(limit = 40): Promise<FeatureFlagLogDto[]> {
  const rows = await db.aptEconomyFeatureFlagLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, username: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    feature: r.feature,
    before: r.before,
    after: r.after,
    reason: r.reason,
    adminName: r.admin.name ?? r.admin.username,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getAdminFeatureFlags(): Promise<EconomyFeatureFlags> {
  return ensureEconomyFeatureFlags();
}

export async function setEconomyFeatureFlag(
  adminId: string,
  key: EconomyFeatureKey,
  enabled: boolean,
  reason?: string | null,
  ip?: string | null
): Promise<EconomyFeatureFlags> {
  await ensureEconomyFeatureFlags();
  const field = flagKeyToField(key);
  const current = await getEconomyFeatureFlags();
  const before = current[field];

  if (before === enabled) {
    return current;
  }

  await db.aptEconomyFeatureFlag.update({
    where: { id: "default" },
    data: { [field]: enabled, updatedById: adminId },
  });

  await writeFlagLog({
    adminId,
    feature: FEATURE_FLAG_LABELS[key],
    before: before ? "ON" : "OFF",
    after: enabled ? "ON" : "OFF",
    reason: reason ?? (enabled ? "기능 재개" : "긴급 차단"),
    ip,
  });

  invalidateFeatureFlagCache();
  return getEconomyFeatureFlags();
}

export async function setAllEconomyFeatureFlags(
  adminId: string,
  patch: Partial<typeof ECONOMY_FEATURE_DEFAULTS>,
  reason: string,
  ip?: string | null
): Promise<EconomyFeatureFlags> {
  await ensureEconomyFeatureFlags();
  const current = await getEconomyFeatureFlags();

  const updates: Partial<typeof ECONOMY_FEATURE_DEFAULTS> = {};
  for (const [k, v] of Object.entries(patch) as [keyof typeof ECONOMY_FEATURE_DEFAULTS, boolean][]) {
    if (typeof v === "boolean" && current[k] !== v) {
      updates[k] = v;
    }
  }

  if (!Object.keys(updates).length) {
    return current;
  }

  await db.aptEconomyFeatureFlag.update({
    where: { id: "default" },
    data: { ...updates, updatedById: adminId },
  });

  for (const [field, enabled] of Object.entries(updates) as [
    keyof typeof ECONOMY_FEATURE_DEFAULTS,
    boolean,
  ][]) {
    const label =
      Object.entries(FEATURE_FLAG_LABELS).find(
        ([k]) => flagKeyToField(k as EconomyFeatureKey) === field
      )?.[1] ?? field;
    await writeFlagLog({
      adminId,
      feature: label,
      before: current[field] ? "ON" : "OFF",
      after: enabled ? "ON" : "OFF",
      reason,
      ip,
    });
  }

  invalidateFeatureFlagCache();
  return getEconomyFeatureFlags();
}
