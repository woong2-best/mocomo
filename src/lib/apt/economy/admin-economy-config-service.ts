import { db } from "@/lib/db";
import { getEconomyConfigFull } from "./config-service";
import { autoSnapshotBeforeAction } from "./backup/snapshot-service";
import {
  CONFIG_FIELD_LABELS,
  ECONOMY_CONFIG_DEFAULTS,
  validateEconomyConfig,
  type EconomyConfigFull,
  type EconomyConfigValues,
} from "./economy-config-types";

export type ConfigChangeLogDto = {
  id: string;
  field: string;
  before: string;
  after: string;
  reason: string | null;
  ip: string | null;
  version: number | null;
  adminName: string;
  createdAt: string;
};

async function writeConfigLog(input: {
  adminId: string;
  field: string;
  before: string;
  after: string;
  reason?: string | null;
  ip?: string | null;
  version?: number;
}) {
  await db.aptEconomyConfigChangeLog.create({
    data: {
      adminId: input.adminId,
      field: input.field,
      before: input.before,
      after: input.after,
      reason: input.reason ?? null,
      ip: input.ip ?? null,
      version: input.version ?? null,
    },
  });
}

export async function listConfigChangeLogs(limit = 50): Promise<ConfigChangeLogDto[]> {
  const rows = await db.aptEconomyConfigChangeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, username: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    field: r.field,
    before: r.before,
    after: r.after,
    reason: r.reason,
    ip: r.ip,
    version: r.version,
    adminName: r.admin.name ?? r.admin.username,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function publishEconomyConfig(
  adminId: string,
  draft: Partial<EconomyConfigValues>,
  reason: string,
  ip?: string | null
): Promise<{ ok: true; config: EconomyConfigFull } | { error: string; fieldErrors?: { field: string; message: string }[] }> {
  const current = await getEconomyConfigFull();
  const merged: EconomyConfigValues = {
    ...ECONOMY_CONFIG_DEFAULTS,
    ...getValuesFromFull(current),
    ...draft,
    emergencyMode: current.emergencyMode,
  };

  const fieldErrors = validateEconomyConfig(merged);
  if (fieldErrors.length > 0) {
    return {
      error: fieldErrors[0]!.message,
      fieldErrors: fieldErrors.map((e) => ({
        field: e.field,
        message: e.message,
      })),
    };
  }

  await autoSnapshotBeforeAction("economy_config_publish", adminId);

  const nextVersion = current.version + 1;
  const now = new Date();

  const updated = await db.aptEconomyConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...merged,
      version: nextVersion,
      publishedAt: now,
      publishedById: adminId,
    },
    update: {
      ...merged,
      version: nextVersion,
      publishedAt: now,
      publishedById: adminId,
    },
    include: { publishedBy: { select: { name: true, username: true } } },
  });

  const prev = getValuesFromFull(current);
  for (const key of Object.keys(merged) as (keyof EconomyConfigValues)[]) {
    const before = prev[key];
    const after = merged[key];
    if (String(before) !== String(after)) {
      await writeConfigLog({
        adminId,
        field: CONFIG_FIELD_LABELS[key] ?? key,
        before: formatFieldValue(key, before),
        after: formatFieldValue(key, after),
        reason,
        ip,
        version: nextVersion,
      });
    }
  }

  const full = await getEconomyConfigFull();
  return { ok: true, config: full };
}

export async function setEmergencyMode(
  adminId: string,
  enabled: boolean,
  reason: string,
  ip?: string | null
): Promise<EconomyConfigFull> {
  const current = await getEconomyConfigFull();
  await db.aptEconomyConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...ECONOMY_CONFIG_DEFAULTS,
      emergencyMode: enabled,
      version: 1,
      publishedAt: new Date(),
      publishedById: adminId,
    },
    update: { emergencyMode: enabled },
  });

  await writeConfigLog({
    adminId,
    field: "Emergency Mode",
    before: current.emergencyMode ? "ON" : "OFF",
    after: enabled ? "ON" : "OFF",
    reason,
    ip,
    version: current.version,
  });

  return getEconomyConfigFull();
}

function getValuesFromFull(full: EconomyConfigFull): EconomyConfigValues {
  const { version: _v, publishedAt: _p, publishedByName: _n, ...rest } = full;
  return rest;
}

function formatFieldValue(key: keyof EconomyConfigValues, value: unknown): string {
  if (typeof value === "boolean") return value ? "ON" : "OFF";
  if (
    key === "marketFee" ||
    key === "defaultFleaFee" ||
    key === "discountDefaultRate" ||
    key === "defaultFleaDiscount" ||
    key === "bonusRate" ||
    key === "npcBuyRate" ||
    key === "npcSellRate"
  ) {
    return `${Math.round(Number(value) * 1000) / 10}%`;
  }
  return String(value);
}

export { getEconomyConfigFull as getAdminEconomyConfig };
