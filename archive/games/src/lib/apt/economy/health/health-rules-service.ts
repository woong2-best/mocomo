import { db } from "@/lib/db";
import { DEFAULT_HEALTH_RULES } from "./health-rules-default";
import type { HealthRuleDto } from "./health-types";

export async function seedHealthRules(): Promise<void> {
  for (const r of DEFAULT_HEALTH_RULES) {
    await db.aptEconomyHealthRule.upsert({
      where: { code: r.code },
      create: {
        code: r.code,
        domain: r.domain,
        label: r.label,
        metric: r.metric,
        operator: r.operator,
        threshold: r.threshold,
        severity: r.severity,
        autoAction: r.autoAction,
        sortOrder: r.sortOrder,
        enabled: true,
      },
      update: {
        label: r.label,
        domain: r.domain,
        metric: r.metric,
      },
    });
  }
}

export async function listHealthRules(): Promise<HealthRuleDto[]> {
  await seedHealthRules();
  const rows = await db.aptEconomyHealthRule.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    domain: r.domain,
    label: r.label,
    metric: r.metric,
    operator: r.operator,
    threshold: r.threshold,
    severity: r.severity as HealthRuleDto["severity"],
    autoAction: r.autoAction as HealthRuleDto["autoAction"],
    enabled: r.enabled,
  }));
}

export async function updateHealthRule(
  ruleId: string,
  adminId: string,
  patch: { threshold?: number; severity?: string; autoAction?: string; enabled?: boolean }
): Promise<HealthRuleDto | null> {
  const row = await db.aptEconomyHealthRule.findUnique({ where: { id: ruleId } });
  if (!row) return null;
  const updated = await db.aptEconomyHealthRule.update({
    where: { id: ruleId },
    data: {
      ...(patch.threshold !== undefined ? { threshold: patch.threshold } : {}),
      ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
      ...(patch.autoAction !== undefined ? { autoAction: patch.autoAction } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      updatedById: adminId,
    },
  });
  return {
    id: updated.id,
    code: updated.code,
    domain: updated.domain,
    label: updated.label,
    metric: updated.metric,
    operator: updated.operator,
    threshold: updated.threshold,
    severity: updated.severity as HealthRuleDto["severity"],
    autoAction: updated.autoAction as HealthRuleDto["autoAction"],
    enabled: updated.enabled,
  };
}
