import { db } from "@/lib/db";

export const DEFAULT_FEATURE_FLAGS: Record<string, { enabled: boolean; description: string }> = {
  promotion: { enabled: true, description: "Promotion 자동 혜택" },
  coupon: { enabled: true, description: "쿠폰 코드 혜택" },
  auction: { enabled: true, description: "중고 경매" },
  live: { enabled: true, description: "라이브 방송" },
  marketplace: { enabled: true, description: "마켓플레이스" },
  wallet: { enabled: true, description: "플랫폼 Wallet" },
  settlement: { enabled: true, description: "정산 원장" },
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
