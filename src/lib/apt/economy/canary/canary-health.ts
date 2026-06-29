import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { rollbackCanary } from "./canary-service";
import type { CanaryRow } from "./canary-types";

export type CanaryHealthEvent = {
  walletError?: boolean;
  marketError?: boolean;
  marketOp?: boolean;
  notificationError?: boolean;
};

const MARKET_ERROR_RATE_THRESHOLD = 0.02;
const FRAUD_INCREASE_THRESHOLD = 0.8;
const WALLET_ERROR_THRESHOLD = 0;

export async function recordCanaryHealthEvent(
  targetType: string,
  event: CanaryHealthEvent
): Promise<void> {
  const canary = await db.aptEconomyCanary.findFirst({
    where: {
      targetType,
      completedAt: null,
      stage: { notIn: ["DRAFT", "ROLLBACK"] },
      autoRollback: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!canary) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000);

  const latest = await db.aptEconomyCanaryHealthMetric.findFirst({
    where: { canaryId: canary.id, windowEnd: { gte: windowStart } },
    orderBy: { windowEnd: "desc" },
  });

  const data = {
    walletErrors: (latest?.walletErrors ?? 0) + (event.walletError ? 1 : 0),
    marketErrors: (latest?.marketErrors ?? 0) + (event.marketError ? 1 : 0),
    marketOps: (latest?.marketOps ?? 0) + (event.marketOp ? 1 : 0),
    notificationErrors: (latest?.notificationErrors ?? 0) + (event.notificationError ? 1 : 0),
    fraudBaseline: latest?.fraudBaseline ?? 0,
    fraudCurrent: latest?.fraudCurrent ?? 0,
    goldSupplyBaseline: latest?.goldSupplyBaseline ?? 0,
    goldSupplyCurrent: latest?.goldSupplyCurrent ?? 0,
    rollbackCount: latest?.rollbackCount ?? 0,
  };

  if (latest) {
    await db.aptEconomyCanaryHealthMetric.update({
      where: { id: latest.id },
      data: { ...data, windowEnd: now },
    });
  } else {
    await db.aptEconomyCanaryHealthMetric.create({
      data: {
        canaryId: canary.id,
        windowStart,
        windowEnd: now,
        ...data,
      },
    });
  }

  await checkAutoRollback(canary.id);
}

export async function snapshotCanaryHealthBaselines(canaryId: string): Promise<void> {
  const [goldAgg, fraudCount] = await Promise.all([
    db.aptWallet.aggregate({ _sum: { gold: true } }),
    db.aptFraudProfile.count({ where: { riskScore: { gte: 70 } } }),
  ]);

  const now = new Date();
  await db.aptEconomyCanaryHealthMetric.create({
    data: {
      canaryId,
      windowStart: now,
      windowEnd: now,
      goldSupplyBaseline: goldAgg._sum.gold ?? 0,
      goldSupplyCurrent: goldAgg._sum.gold ?? 0,
      fraudBaseline: fraudCount,
      fraudCurrent: fraudCount,
    },
  });
}

async function checkAutoRollback(canaryId: string): Promise<void> {
  const canary = await db.aptEconomyCanary.findUnique({ where: { id: canaryId } });
  if (!canary || !canary.autoRollback || canary.stage === "ROLLBACK") return;

  const metric = await db.aptEconomyCanaryHealthMetric.findFirst({
    where: { canaryId },
    orderBy: { windowEnd: "desc" },
  });
  if (!metric) return;

  let shouldRollback = false;
  let trigger = "";

  if (metric.walletErrors > WALLET_ERROR_THRESHOLD) {
    shouldRollback = true;
    trigger = "wallet_failure";
  }

  if (metric.marketOps > 0 && metric.marketErrors / metric.marketOps > MARKET_ERROR_RATE_THRESHOLD) {
    shouldRollback = true;
    trigger = "market_error_rate";
  }

  if (metric.fraudBaseline > 0) {
    const increase = (metric.fraudCurrent - metric.fraudBaseline) / metric.fraudBaseline;
    if (increase > FRAUD_INCREASE_THRESHOLD) {
      shouldRollback = true;
      trigger = "fraud_spike";
    }
  }

  if (!shouldRollback) return;

  await db.aptEconomyCanaryHealthMetric.update({
    where: { id: metric.id },
    data: { rollbackCount: metric.rollbackCount + 1 },
  });

  await rollbackCanary({
    canaryId,
    adminId: canary.createdById ?? "system",
    reason: `Auto rollback: ${trigger}`,
    restoreFromSnapshot: Boolean(canary.rollbackSnapshotId),
  });
}

export async function getCanaryHealthSummary(canary: CanaryRow): Promise<{
  operatorUsers: number;
  testerUsers: number;
  percentUsers: number;
  totalCanaryUsers: number;
  errors: number;
  rollbackActive: boolean;
  autoRollback: boolean;
}> {
  const { userCanaryBucket } = await import("./canary-bucket");

  const wallets = await db.aptWallet.findMany({ select: { userId: true } });
  let operatorUsers = 0;
  let testerUsers = 0;
  let percentUsers = 0;

  for (const w of wallets) {
    if (canary.operatorUserIds.includes(w.userId)) operatorUsers++;
    else if (canary.testerUserIds.includes(w.userId)) testerUsers++;
    else if (
      canary.stage === "PERCENT" &&
      userCanaryBucket(w.userId, canary.id) < canary.percent
    ) {
      percentUsers++;
    } else if (canary.stage === "FULL") {
      percentUsers++;
    }
  }

  const metric = await db.aptEconomyCanaryHealthMetric.findFirst({
    where: { canaryId: canary.id },
    orderBy: { windowEnd: "desc" },
  });

  const errors =
    (metric?.walletErrors ?? 0) +
    (metric?.marketErrors ?? 0) +
    (metric?.notificationErrors ?? 0);

  return {
    operatorUsers,
    testerUsers,
    percentUsers,
    totalCanaryUsers: operatorUsers + testerUsers + percentUsers,
    errors,
    rollbackActive: canary.stage === "ROLLBACK",
    autoRollback: canary.autoRollback,
  };
}

export async function refreshCanaryFraudAndGoldMetrics(canaryId: string): Promise<void> {
  const metric = await db.aptEconomyCanaryHealthMetric.findFirst({
    where: { canaryId },
    orderBy: { createdAt: "asc" },
  });
  if (!metric) return;

  const [goldAgg, fraudCount] = await Promise.all([
    db.aptWallet.aggregate({ _sum: { gold: true } }),
    db.aptFraudProfile.count({ where: { riskScore: { gte: 70 } } }),
  ]);

  await db.aptEconomyCanaryHealthMetric.update({
    where: { id: metric.id },
    data: {
      goldSupplyCurrent: goldAgg._sum.gold ?? 0,
      fraudCurrent: fraudCount,
      windowEnd: new Date(),
    } as Prisma.AptEconomyCanaryHealthMetricUpdateInput,
  });
}
