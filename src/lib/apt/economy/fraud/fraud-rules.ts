import { db } from "@/lib/db";
import { DEFAULT_FRAUD_RULES, type FraudRuleCode } from "./fraud-types";
import {
  DEFAULT_RULE_THRESHOLDS,
  parseRuleThreshold,
  type FraudRuleConfig,
} from "./fraud-rule-thresholds";

export async function ensureFraudRuleMeta(): Promise<{ version: number }> {
  const row = await db.aptFraudRuleMeta.upsert({
    where: { id: "default" },
    create: { id: "default", version: 1 },
    update: {},
  });
  return { version: row.version };
}

export async function seedFraudRules(): Promise<void> {
  for (const r of DEFAULT_FRAUD_RULES) {
    const threshold = DEFAULT_RULE_THRESHOLDS[r.id];
    const existing = await db.aptFraudRule.findUnique({
      where: { id: r.id },
      select: { threshold: true },
    });
    await db.aptFraudRule.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        label: r.label,
        weight: r.weight,
        enabled: true,
        threshold,
        description: r.description,
      },
      update: {
        label: r.label,
        description: r.description,
        ...(existing?.threshold == null ? { threshold } : {}),
      },
    });
  }
  await ensureFraudRuleMeta();
}

function rowToConfig(row: {
  id: string;
  label: string;
  weight: number;
  enabled: boolean;
  threshold: unknown;
  description: string | null;
}): FraudRuleConfig {
  return {
    id: row.id as FraudRuleCode,
    label: row.label,
    weight: row.weight,
    enabled: row.enabled,
    threshold: parseRuleThreshold(row.id as FraudRuleCode, row.threshold),
    description: row.description,
  };
}

export async function getAllFraudRules(): Promise<FraudRuleConfig[]> {
  await seedFraudRules();
  const rows = await db.aptFraudRule.findMany({ orderBy: { id: "asc" } });
  return rows.map(rowToConfig);
}

export async function getEnabledFraudRules(): Promise<FraudRuleConfig[]> {
  const all = await getAllFraudRules();
  return all.filter((r) => r.enabled);
}

export async function resolveFraudRulesForUser(userId: string): Promise<FraudRuleConfig[]> {
  const published = await getEnabledFraudRules();
  const { getActiveCanary } = await import("../canary/canary-service");
  const { shouldApplyCanary } = await import("../canary/canary-resolve");
  const canary = await getActiveCanary("FRAUD_RULE", "default");
  if (!canary || !shouldApplyCanary(userId, canary)) return published;
  const draft = canary.draftPayload as { rules?: FraudRuleConfig[] };
  return draft.rules ?? published;
}

export async function getFraudRuleMeta(): Promise<{
  version: number;
  publishedAt: string | null;
  publishedByName: string | null;
}> {
  await seedFraudRules();
  const meta = await db.aptFraudRuleMeta.findUnique({
    where: { id: "default" },
    include: { publishedBy: { select: { name: true, username: true } } },
  });
  return {
    version: meta?.version ?? 1,
    publishedAt: meta?.publishedAt?.toISOString() ?? null,
    publishedByName: meta?.publishedBy?.name ?? meta?.publishedBy?.username ?? null,
  };
}
