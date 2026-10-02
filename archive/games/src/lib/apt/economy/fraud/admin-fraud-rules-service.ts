import { db } from "@/lib/db";
import { autoSnapshotBeforeAction } from "../backup/snapshot-service";
import {
  getAllFraudRules,
  getFraudRuleMeta,
  seedFraudRules,
} from "./fraud-rules";
import {
  evaluateUserFraudRisk,
  simulateFraudRuleImpact,
  type FraudEvaluation,
} from "./fraud-engine";
import {
  DEFAULT_RULE_THRESHOLDS,
  RULE_THRESHOLD_LABELS,
  parseRuleThreshold,
  type FraudRuleConfig,
} from "./fraud-rule-thresholds";
import { DEFAULT_FRAUD_RULES, type FraudRuleCode } from "./fraud-types";

export type FraudRuleRowDto = FraudRuleConfig & {
  thresholdLabels: { key: string; label: string; hint?: string }[];
};

export type FraudRuleChangeLogDto = {
  id: string;
  ruleId: string | null;
  field: string;
  before: string;
  after: string;
  reason: string | null;
  ip: string | null;
  version: number | null;
  adminName: string;
  createdAt: string;
};

export type FraudRulePublishPatch = {
  id: FraudRuleCode;
  weight?: number;
  enabled?: boolean;
  threshold?: Record<string, number>;
};

const RULE_FIELD_LABELS: Record<string, string> = {
  weight: "Weight",
  enabled: "Enabled",
  threshold: "Threshold",
};

function formatThreshold(ruleId: FraudRuleCode, t: Record<string, number>): string {
  const labels = RULE_THRESHOLD_LABELS[ruleId];
  return labels
    .map((l) => `${l.label}=${t[l.key] ?? "?"}`)
    .join(", ");
}

function validateRulePatch(
  ruleId: FraudRuleCode,
  patch: FraudRulePublishPatch
): string | null {
  if (patch.weight !== undefined) {
    if (!Number.isInteger(patch.weight) || patch.weight < 0 || patch.weight > 100) {
      return `${ruleId}: Weight는 0~100 정수여야 합니다.`;
    }
  }
  if (patch.threshold) {
    const defaults = DEFAULT_RULE_THRESHOLDS[ruleId];
    for (const key of Object.keys(defaults)) {
      const v = patch.threshold[key];
      if (v !== undefined && (!Number.isFinite(v) || v < 0)) {
        return `${ruleId}: ${key}는 0 이상이어야 합니다.`;
      }
    }
  }
  return null;
}

export async function initFraudRulesAdmin(): Promise<void> {
  await seedFraudRules();
}

export async function getFraudRulesAdminPageData(): Promise<{
  rules: FraudRuleRowDto[];
  meta: Awaited<ReturnType<typeof getFraudRuleMeta>>;
  changeLogs: FraudRuleChangeLogDto[];
}> {
  await seedFraudRules();
  const [rules, meta, changeLogs] = await Promise.all([
    getAllFraudRules(),
    getFraudRuleMeta(),
    listFraudRuleChangeLogs(40),
  ]);
  return {
    rules: rules.map((r) => ({
      ...r,
      thresholdLabels: RULE_THRESHOLD_LABELS[r.id],
    })),
    meta,
    changeLogs,
  };
}

export async function listFraudRuleChangeLogs(limit = 50): Promise<FraudRuleChangeLogDto[]> {
  const rows = await db.aptFraudRuleChangeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, username: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    ruleId: r.ruleId,
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

export async function publishFraudRules(
  adminId: string,
  patches: FraudRulePublishPatch[],
  reason: string,
  ip?: string | null
): Promise<{ ok: true; version: number } | { error: string }> {
  if (!reason.trim()) return { error: "변경 사유를 입력하세요." };

  for (const p of patches) {
    const err = validateRulePatch(p.id, p);
    if (err) return { error: err };
  }

  const current = await getAllFraudRules();
  const currentMap = new Map(current.map((r) => [r.id, r]));

  const meta = await db.aptFraudRuleMeta.findUnique({ where: { id: "default" } });
  const nextVersion = (meta?.version ?? 1) + 1;
  const now = new Date();

  await autoSnapshotBeforeAction("fraud_rules_publish", adminId);

  try {
    await db.$transaction(async (tx) => {
    let anyChanged = false;

    for (const patch of patches) {
      const prev = currentMap.get(patch.id);
      if (!prev) continue;

      const nextWeight = patch.weight ?? prev.weight;
      const nextEnabled = patch.enabled ?? prev.enabled;
      const nextThreshold = patch.threshold
        ? { ...prev.threshold, ...patch.threshold }
        : prev.threshold;

      const changed =
        nextWeight !== prev.weight ||
        nextEnabled !== prev.enabled ||
        JSON.stringify(nextThreshold) !== JSON.stringify(prev.threshold);

      if (!changed) continue;
      anyChanged = true;

      await tx.aptFraudRule.update({
        where: { id: patch.id },
        data: {
          weight: nextWeight,
          enabled: nextEnabled,
          threshold: nextThreshold,
        },
      });

      const log = async (field: string, before: string, after: string) => {
        await tx.aptFraudRuleChangeLog.create({
          data: {
            adminId,
            ruleId: patch.id,
            field,
            before,
            after,
            reason,
            ip: ip ?? null,
            version: nextVersion,
          },
        });
      };

      if (nextWeight !== prev.weight) {
        await log(`${patch.id} · ${RULE_FIELD_LABELS.weight}`, String(prev.weight), String(nextWeight));
      }
      if (nextEnabled !== prev.enabled) {
        await log(
          `${patch.id} · ${RULE_FIELD_LABELS.enabled}`,
          prev.enabled ? "ON" : "OFF",
          nextEnabled ? "ON" : "OFF"
        );
      }
      if (JSON.stringify(nextThreshold) !== JSON.stringify(prev.threshold)) {
        await log(
          `${patch.id} · ${RULE_FIELD_LABELS.threshold}`,
          formatThreshold(patch.id, prev.threshold),
          formatThreshold(patch.id, nextThreshold)
        );
      }
    }

    if (!anyChanged) {
      throw new Error("NO_CHANGES");
    }

    await tx.aptFraudRuleMeta.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        version: nextVersion,
        publishedAt: now,
        publishedById: adminId,
      },
      update: {
        version: nextVersion,
        publishedAt: now,
        publishedById: adminId,
      },
    });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_CHANGES") {
      return { error: "변경된 항목이 없습니다." };
    }
    throw e;
  }

  const afterMeta = await db.aptFraudRuleMeta.findUnique({ where: { id: "default" } });
  return { ok: true, version: afterMeta?.version ?? nextVersion };
}

export async function previewFraudUserByUsername(
  username: string,
  draftRules?: FraudRuleConfig[]
): Promise<
  | {
      ok: true;
      user: { id: string; username: string };
      published: FraudEvaluation;
      draft: FraudEvaluation | null;
    }
  | { ok: false; error: string }
> {
  const q = username.trim().toLowerCase();
  if (!q) return { ok: false, error: "사용자명을 입력하세요." };

  const user = await db.user.findFirst({
    where: { username: { equals: q, mode: "insensitive" } },
    select: { id: true, username: true },
  });
  if (!user) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const publishedRules = (await getAllFraudRules()).filter((r) => r.enabled);
  const [published, draftEval] = await Promise.all([
    evaluateUserFraudRisk(user.id, publishedRules),
    draftRules
      ? evaluateUserFraudRisk(
          user.id,
          draftRules.filter((r) => r.enabled)
        )
      : Promise.resolve(null),
  ]);

  return {
    ok: true,
    user: { id: user.id, username: user.username },
    published,
    draft: draftEval,
  };
}

export async function simulateFraudRulesDraft(
  draftRules: FraudRuleConfig[]
): Promise<Awaited<ReturnType<typeof simulateFraudRuleImpact>>> {
  return simulateFraudRuleImpact(draftRules);
}

export function buildDraftFromPublished(
  published: FraudRuleRowDto[],
  edits: Record<string, Partial<FraudRulePublishPatch>>
): FraudRuleConfig[] {
  return published.map((r) => {
    const edit = edits[r.id];
    const threshold = edit?.threshold
      ? { ...r.threshold, ...edit.threshold }
      : r.threshold;
    return {
      id: r.id,
      label: r.label,
      weight: edit?.weight ?? r.weight,
      enabled: edit?.enabled ?? r.enabled,
      threshold: parseRuleThreshold(r.id, threshold),
      description: r.description,
    };
  });
}

export { DEFAULT_FRAUD_RULES, RULE_THRESHOLD_LABELS };
