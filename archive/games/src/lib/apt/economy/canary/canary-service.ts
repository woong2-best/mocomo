import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { autoSnapshotBeforeAction } from "../backup/snapshot-service";
import { publishEconomyConfig } from "../admin-economy-config-service";
import { publishFraudRules } from "../fraud/admin-fraud-rules-service";
import type { EconomyConfigValues } from "../economy-config-types";
import { newCanaryCorrelationId, writeCanaryLog } from "./canary-audit";
import { shouldApplyCanary } from "./canary-resolve";
import {
  CANARY_PROMOTE_LADDER,
  type CanaryPromoteStep,
  type CanaryRow,
  type CanaryStage,
  type CanaryTargetType,
  type PromotePreview,
} from "./canary-types";

type DbCanary = {
  id: string;
  targetType: string;
  targetId: string;
  stage: string;
  percent: number;
  operatorUserIds: unknown;
  testerUserIds: unknown;
  draftPayload: unknown;
  reason: string | null;
  publishedVersion: number | null;
  rollbackSnapshotId: string | null;
  correlationId: string | null;
  autoRollback: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export function toCanaryRow(row: DbCanary): CanaryRow {
  return {
    id: row.id,
    targetType: row.targetType as CanaryTargetType,
    targetId: row.targetId,
    stage: row.stage as CanaryStage,
    percent: row.percent,
    operatorUserIds: (row.operatorUserIds as string[]) ?? [],
    testerUserIds: (row.testerUserIds as string[]) ?? [],
    draftPayload: row.draftPayload,
    reason: row.reason,
    publishedVersion: row.publishedVersion,
    rollbackSnapshotId: row.rollbackSnapshotId,
    correlationId: row.correlationId,
    autoRollback: row.autoRollback,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function getActiveCanary(
  targetType: CanaryTargetType,
  targetId = "default"
): Promise<CanaryRow | null> {
  const row = await db.aptEconomyCanary.findFirst({
    where: {
      targetType,
      targetId,
      completedAt: null,
      stage: { not: "ROLLBACK" },
    },
    orderBy: { updatedAt: "desc" },
  });
  return row ? toCanaryRow(row) : null;
}

export async function getCanaryById(id: string): Promise<CanaryRow | null> {
  const row = await db.aptEconomyCanary.findUnique({ where: { id } });
  return row ? toCanaryRow(row) : null;
}

export async function listActiveCanaries(): Promise<CanaryRow[]> {
  const rows = await db.aptEconomyCanary.findMany({
    where: { completedAt: null },
    orderBy: [{ targetType: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(toCanaryRow);
}

function ladderIndex(stage: CanaryStage, percent: number): number {
  if (stage === "DRAFT") return -1;
  return CANARY_PROMOTE_LADDER.findIndex(
    (s) => s.stage === stage && s.percent === percent
  );
}

export function getNextPromoteStep(
  stage: CanaryStage,
  percent: number
): CanaryPromoteStep | { action: "publish"; label: string } | null {
  if (stage === "ROLLBACK" || stage === "DRAFT") {
    return CANARY_PROMOTE_LADDER[0] ?? null;
  }
  const idx = ladderIndex(stage, percent);
  if (idx < 0) return CANARY_PROMOTE_LADDER[0] ?? null;
  if (idx >= CANARY_PROMOTE_LADDER.length - 1) {
    return { action: "publish", label: "Published (Production)" };
  }
  return CANARY_PROMOTE_LADDER[idx + 1]!;
}

export async function countUsersInCanary(canary: CanaryRow): Promise<number> {
  const wallets = await db.aptWallet.findMany({ select: { userId: true } });
  return wallets.filter((w) => shouldApplyCanary(w.userId, canary)).length;
}

export async function buildPromotePreview(canary: CanaryRow): Promise<PromotePreview> {
  const currentStep =
    CANARY_PROMOTE_LADDER.find((s) => s.stage === canary.stage && s.percent === canary.percent) ??
    ({
      stage: canary.stage,
      percent: canary.percent,
      label: canary.stage,
    } as CanaryPromoteStep);

  const next = getNextPromoteStep(canary.stage, canary.percent);
  if (!next) {
    return {
      current: currentStep,
      next: { action: "publish", label: "Published" },
      expectedUsers: 0,
    };
  }

  const previewCanary: CanaryRow = { ...canary };
  if ("action" in next) {
    previewCanary.stage = "FULL";
    previewCanary.percent = 100;
  } else {
    previewCanary.stage = next.stage;
    previewCanary.percent = next.percent;
  }

  const expectedUsers = await countUsersInCanary(previewCanary);
  return { current: currentStep, next, expectedUsers };
}

export async function createCanary(input: {
  targetType: CanaryTargetType;
  targetId?: string;
  draftPayload: unknown;
  operatorUserIds?: string[];
  testerUserIds?: string[];
  reason?: string;
  publishedVersion?: number;
  adminId: string;
}): Promise<CanaryRow> {
  const correlationId = newCanaryCorrelationId();
  const row = await db.aptEconomyCanary.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId ?? "default",
      stage: "DRAFT",
      percent: 0,
      operatorUserIds: (input.operatorUserIds ?? []) as Prisma.InputJsonValue,
      testerUserIds: (input.testerUserIds ?? []) as Prisma.InputJsonValue,
      draftPayload: input.draftPayload as Prisma.InputJsonValue,
      reason: input.reason ?? null,
      publishedVersion: input.publishedVersion ?? null,
      correlationId,
      createdById: input.adminId,
    },
  });

  await writeCanaryLog({
    canaryId: row.id,
    adminId: input.adminId,
    action: "create",
    correlationId,
    toStage: "DRAFT",
    reason: input.reason,
  });

  return toCanaryRow(row);
}

async function publishCanaryDraft(
  canary: CanaryRow,
  adminId: string,
  reason: string
): Promise<void> {
  const draft = canary.draftPayload as Record<string, unknown>;

  switch (canary.targetType) {
    case "CONFIG": {
      await publishEconomyConfig(
        adminId,
        draft as Partial<EconomyConfigValues>,
        reason || `Canary publish ${canary.id}`
      );
      break;
    }
    case "FRAUD_RULE": {
      const patches = (draft.patches as Parameters<typeof publishFraudRules>[1]) ?? [];
      await publishFraudRules(adminId, patches, reason || `Canary publish ${canary.id}`);
      break;
    }
    case "FEATURE_FLAG": {
      const { invalidateFeatureFlagCache } = await import("../feature-flag-service");
      const { id: _id, updatedAt: _u, updatedByName: _n, ...flags } = draft;
      await db.aptEconomyFeatureFlag.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          shopEnabled: Boolean(flags.shopEnabled ?? true),
          marketEnabled: Boolean(flags.marketEnabled ?? true),
          liveEnabled: Boolean(flags.liveEnabled ?? true),
          missionEnabled: Boolean(flags.missionEnabled ?? true),
          notificationEnabled: Boolean(flags.notificationEnabled ?? true),
          fleaEnabled: Boolean(flags.fleaEnabled ?? true),
          iapEnabled: Boolean(flags.iapEnabled ?? true),
          updatedById: adminId,
        },
        update: {
          shopEnabled: Boolean(flags.shopEnabled ?? true),
          marketEnabled: Boolean(flags.marketEnabled ?? true),
          liveEnabled: Boolean(flags.liveEnabled ?? true),
          missionEnabled: Boolean(flags.missionEnabled ?? true),
          notificationEnabled: Boolean(flags.notificationEnabled ?? true),
          fleaEnabled: Boolean(flags.fleaEnabled ?? true),
          iapEnabled: Boolean(flags.iapEnabled ?? true),
          updatedById: adminId,
        },
      });
      invalidateFeatureFlagCache();
      break;
    }
    case "SHOP": {
      const offer = draft as {
        id?: string;
        itemId: string;
        goldPrice: number;
        originalGoldPrice?: number | null;
        featured?: boolean;
        isNew?: boolean;
        limitedStock?: number | null;
        enabled?: boolean;
        sortOrder?: number;
      };
      if (offer.id) {
        await db.aptGoldShopOffer.update({
          where: { id: offer.id },
          data: {
            goldPrice: offer.goldPrice,
            originalGoldPrice: offer.originalGoldPrice ?? null,
            featured: offer.featured ?? false,
            isNew: offer.isNew ?? false,
            limitedStock: offer.limitedStock ?? null,
            enabled: offer.enabled ?? true,
            sortOrder: offer.sortOrder ?? 0,
          },
        });
      }
      break;
    }
    case "FLEA": {
      const event = draft as {
        id: string;
        title?: string;
        feeRate?: number;
        published?: boolean;
        active?: boolean;
      };
      await db.aptFleaEvent.update({
        where: { id: event.id },
        data: {
          ...(event.title != null ? { title: event.title } : {}),
          ...(event.feeRate != null ? { feeRate: event.feeRate } : {}),
          ...(event.published != null ? { published: event.published } : {}),
          ...(event.active != null ? { active: event.active } : {}),
        },
      });
      break;
    }
    case "IAP_PRICE": {
      const product = draft as {
        id: string;
        amount?: number;
        bonusAmount?: number;
        priceTier?: number;
        enabled?: boolean;
      };
      await db.aptShopProduct.update({
        where: { id: product.id },
        data: {
          ...(product.amount != null ? { amount: product.amount } : {}),
          ...(product.bonusAmount != null ? { bonusAmount: product.bonusAmount } : {}),
          ...(product.priceTier != null ? { priceTier: product.priceTier } : {}),
          ...(product.enabled != null ? { enabled: product.enabled } : {}),
        },
      });
      break;
    }
  }
}

export async function promoteCanary(
  canaryId: string,
  adminId: string,
  reason: string
): Promise<{ ok: true; canary: CanaryRow } | { error: string }> {
  const canary = await getCanaryById(canaryId);
  if (!canary) return { error: "Canary를 찾을 수 없습니다." };
  if (canary.completedAt) return { error: "이미 완료된 Canary입니다." };
  if (canary.stage === "ROLLBACK") return { error: "Rollback 상태에서는 Promote할 수 없습니다." };

  const next = getNextPromoteStep(canary.stage, canary.percent);
  if (!next) return { error: "더 이상 Promote할 단계가 없습니다." };

  const correlationId = canary.correlationId ?? newCanaryCorrelationId();
  const fromStage = canary.stage;
  const fromPercent = canary.percent;

  if ("action" in next) {
    const snapId = await autoSnapshotBeforeAction("canary_publish", adminId);
    await publishCanaryDraft(canary, adminId, reason);
    const updated = await db.aptEconomyCanary.update({
      where: { id: canaryId },
      data: {
        stage: "FULL",
        percent: 100,
        completedAt: new Date(),
        rollbackSnapshotId: snapId,
        correlationId,
      },
    });
    await writeCanaryLog({
      canaryId,
      adminId,
      action: "publish",
      correlationId,
      fromStage,
      toStage: "FULL",
      fromPercent,
      toPercent: 100,
      reason,
      metadata: { snapshotId: snapId },
    });
    return { ok: true, canary: toCanaryRow(updated) };
  }

  const updated = await db.aptEconomyCanary.update({
    where: { id: canaryId },
    data: {
      stage: next.stage,
      percent: next.percent,
      startedAt: canary.startedAt ?? new Date(),
      correlationId,
    },
  });

  if (fromStage === "DRAFT") {
    const { snapshotCanaryHealthBaselines } = await import("./canary-health");
    await snapshotCanaryHealthBaselines(canaryId);
  }

  await writeCanaryLog({
    canaryId,
    adminId,
    action: "promote",
    correlationId,
    fromStage,
    toStage: next.stage,
    fromPercent,
    toPercent: next.percent,
    reason,
  });

  return { ok: true, canary: toCanaryRow(updated) };
}

export async function rollbackCanary(input: {
  canaryId: string;
  adminId: string;
  reason: string;
  restoreFromSnapshot?: boolean;
}): Promise<{ ok: true; canary: CanaryRow; correlationId: string } | { error: string }> {
  const canary = await getCanaryById(input.canaryId);
  if (!canary) return { error: "Canary를 찾을 수 없습니다." };

  const correlationId = newCanaryCorrelationId();
  const snapId =
    canary.rollbackSnapshotId ??
    (await autoSnapshotBeforeAction("canary_rollback", input.adminId));

  if (input.restoreFromSnapshot && snapId) {
    const { getEconomySnapshot } = await import("../backup/snapshot-service");
    const { executePartialRestore } = await import("../backup/backup-restore-service");
    const snap = await getEconomySnapshot(snapId);
    if (snap) {
      const scopeMap: Record<CanaryTargetType, import("../backup/backup-types").RestoreScope> = {
        CONFIG: "config",
        FEATURE_FLAG: "featureFlags",
        FRAUD_RULE: "fraudRules",
        SHOP: "goldShop",
        FLEA: "flea",
        IAP_PRICE: "config",
      };
      const scope = scopeMap[canary.targetType];
      await executePartialRestore({
        snapshotId: snapId,
        payload: snap.payload,
        checksum: snap.checksum,
        scopes: [scope],
        adminId: input.adminId,
        reason: `Canary rollback: ${input.reason}`,
        dryRun: false,
      });
    }
  }

  const updated = await db.aptEconomyCanary.update({
    where: { id: input.canaryId },
    data: {
      stage: "ROLLBACK",
      completedAt: new Date(),
      rollbackSnapshotId: snapId,
      correlationId,
    },
  });

  await writeCanaryLog({
    canaryId: input.canaryId,
    adminId: input.adminId,
    action: "rollback",
    correlationId,
    fromStage: canary.stage,
    toStage: "ROLLBACK",
    fromPercent: canary.percent,
    reason: input.reason,
    metadata: { snapshotId: snapId, restored: input.restoreFromSnapshot ?? false },
  });

  return { ok: true, canary: toCanaryRow(updated), correlationId };
}

export async function listCanaryLogs(canaryId?: string, limit = 40) {
  const rows = await db.aptEconomyCanaryLog.findMany({
    where: canaryId ? { canaryId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, username: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    canaryId: r.canaryId,
    action: r.action,
    fromStage: r.fromStage,
    toStage: r.toStage,
    fromPercent: r.fromPercent,
    toPercent: r.toPercent,
    correlationId: r.correlationId,
    reason: r.reason,
    adminName: r.admin?.name ?? r.admin?.username ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
