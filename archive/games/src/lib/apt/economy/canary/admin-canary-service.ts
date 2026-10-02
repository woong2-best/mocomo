import { db } from "@/lib/db";
import { getEconomyConfigFull } from "../config-service";
import { getEconomyFeatureFlags } from "../feature-flag-service";
import { getAllFraudRules } from "../fraud/fraud-rules";
import { calcGoldFromGems } from "../economy-config-types";
import {
  buildPromotePreview,
  createCanary,
  getActiveCanary,
  getCanaryById,
  listActiveCanaries,
  listCanaryLogs,
  promoteCanary,
  rollbackCanary,
} from "./canary-service";
import { getCanaryHealthSummary } from "./canary-health";
import { mergeEconomyConfig, shouldApplyCanary } from "./canary-resolve";
import type {
  CanaryHealthSummary,
  CanaryLogDto,
  CanaryPreview,
  CanaryRow,
  CanaryTargetType,
  PromotePreview,
} from "./canary-types";

export type CanaryAdminCard = {
  canary: CanaryRow;
  health: CanaryHealthSummary;
  promotePreview: PromotePreview | null;
};

export async function getCanaryAdminPageData(): Promise<{
  cards: CanaryAdminCard[];
  history: CanaryLogDto[];
  recentSnapshots: { id: string; label: string; createdAt: string }[];
}> {
  const [active, history, snapshots] = await Promise.all([
    listActiveCanaries(),
    listCanaryLogs(undefined, 50),
    db.aptEconomySnapshot.findMany({
      where: { type: { in: ["before_publish", "before_restore"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, label: true, createdAt: true },
    }),
  ]);

  const cards: CanaryAdminCard[] = await Promise.all(
    active.map(async (canary) => {
      const [health, promotePreview] = await Promise.all([
        getCanaryHealthSummary(canary),
        canary.stage !== "ROLLBACK" && !canary.completedAt
          ? buildPromotePreview(canary)
          : Promise.resolve(null),
      ]);
      return { canary, health, promotePreview };
    })
  );

  return {
    cards,
    history,
    recentSnapshots: snapshots.map((s) => ({
      id: s.id,
      label: s.label,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export async function createConfigCanaryDraft(
  adminId: string,
  draft: Record<string, unknown>,
  operatorUserIds: string[],
  testerUserIds: string[],
  reason: string
): Promise<CanaryRow> {
  const current = await getEconomyConfigFull();
  const existing = await getActiveCanary("CONFIG");
  if (existing) {
    throw new Error("이미 진행 중인 Config Canary가 있습니다.");
  }
  return createCanary({
    targetType: "CONFIG",
    targetId: "default",
    draftPayload: draft,
    operatorUserIds,
    testerUserIds,
    reason,
    publishedVersion: current.version,
    adminId,
  });
}

export async function previewCanaryForUser(
  canaryId: string,
  userId: string
): Promise<CanaryPreview | { error: string }> {
  const canary = await getCanaryById(canaryId);
  if (!canary) return { error: "Canary를 찾을 수 없습니다." };

  const inCanary = shouldApplyCanary(userId, canary);
  const draft = canary.draftPayload as Record<string, unknown>;

  switch (canary.targetType) {
    case "CONFIG": {
      const published = await getEconomyConfigFull();
      const merged = mergeEconomyConfig(published, draft);
      const gems = 100;
      return {
        userId,
        inCanary,
        targetType: canary.targetType,
        published: {
          goldPerGem: published.goldPerGem,
          example: `${gems} Gems = ${calcGoldFromGems(gems, published)} Gold`,
        },
        canary: {
          goldPerGem: merged.goldPerGem,
          example: `${gems} Gems = ${calcGoldFromGems(gems, merged)} Gold`,
        },
      };
    }
    case "FEATURE_FLAG": {
      const published = await getEconomyFeatureFlags();
      return {
        userId,
        inCanary,
        targetType: canary.targetType,
        published: published as unknown as Record<string, unknown>,
        canary: inCanary ? { ...published, ...draft } : (published as unknown as Record<string, unknown>),
      };
    }
    case "FRAUD_RULE": {
      const published = await getAllFraudRules();
      return {
        userId,
        inCanary,
        targetType: canary.targetType,
        published: { rules: published },
        canary: draft,
      };
    }
    default:
      return {
        userId,
        inCanary,
        targetType: canary.targetType,
        published: {},
        canary: draft,
      };
  }
}

export {
  promoteCanary,
  rollbackCanary,
  getActiveCanary,
  listCanaryLogs,
  buildPromotePreview,
};
