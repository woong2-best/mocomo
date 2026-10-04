import { db } from "@/lib/db";

export const DEFAULT_FEATURE_FLAGS: Record<string, { enabled: boolean; description: string }> = {
  auction: { enabled: true, description: "Used-goods auction" },
  live: { enabled: true, description: "Live streaming" },
  marketplace: { enabled: true, description: "Marketplace" },
  wallet: { enabled: true, description: "Platform Wallet" },
  settlement: { enabled: true, description: "Settlement ledger" },
  visa_extended_auth: {
    enabled: false,
    description: "Visa Extended Authorization (Stripe US merchant approval required to enable)",
  },
};

/** 재배포 없이 Feature Flag ON/OFF (DB FeatureFlag) */
export async function isFeatureEnabled(key: string, fallback = true): Promise<boolean> {
  try {
    const row = await db.featureFlag.findUnique({ where: { key } });
    if (!row) {
      const def = DEFAULT_FEATURE_FLAGS[key];
      return def?.enabled ?? fallback;
    }
    return row.enabled;
  } catch {
    return fallback;
  }
}

export async function listFeatureFlags() {
  const rows = await db.featureFlag.findMany({ orderBy: { key: "asc" } });
  const map = new Map(rows.map((r) => [r.key, r]));
  return Object.entries(DEFAULT_FEATURE_FLAGS).map(([key, def]) => {
    const row = map.get(key);
    return {
      key,
      enabled: row?.enabled ?? def.enabled,
      description: row?.description ?? def.description,
      id: row?.id ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  opts?: { description?: string; updatedById?: string }
) {
  const def = DEFAULT_FEATURE_FLAGS[key];
  return db.featureFlag.upsert({
    where: { key },
    create: {
      key,
      enabled,
      description: opts?.description ?? def?.description ?? null,
      updatedById: opts?.updatedById,
    },
    update: {
      enabled,
      description: opts?.description,
      updatedById: opts?.updatedById,
    },
  });
}

export async function ensureDefaultFeatureFlags() {
  for (const [key, def] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
    await db.featureFlag.upsert({
      where: { key },
      create: { key, enabled: def.enabled, description: def.description },
      update: {},
    });
  }
}
