import type { EconomyConfigFull, EconomyConfigValues } from "../economy-config-types";
import { userCanaryBucket } from "./canary-bucket";
import type { CanaryRow, CanaryStage } from "./canary-types";

export function shouldApplyCanary(
  userId: string,
  canary: Pick<
    CanaryRow,
    "id" | "stage" | "percent" | "operatorUserIds" | "testerUserIds"
  >
): boolean {
  const stage = canary.stage as CanaryStage;
  if (stage === "ROLLBACK" || stage === "DRAFT") return false;
  if (stage === "FULL") return true;

  if (canary.operatorUserIds.includes(userId)) return true;
  if (stage === "OPERATOR") return false;

  if (canary.testerUserIds.includes(userId)) return true;
  if (stage === "TESTER") return false;

  if (stage === "PERCENT" && canary.percent > 0) {
    return userCanaryBucket(userId, canary.id) < canary.percent;
  }

  return false;
}

export function mergeEconomyConfig(
  published: EconomyConfigFull,
  draft: Partial<EconomyConfigValues>
): EconomyConfigFull {
  return {
    ...published,
    ...draft,
    version: published.version,
    publishedAt: published.publishedAt,
    publishedByName: published.publishedByName,
  };
}
