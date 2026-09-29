import type { Prisma } from "@prisma/client";
import { MocoSettlementCycleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { syncEarnedMocoDisplayTier } from "@/lib/settlement-moco/balance";
import { previousMonthEarnedPeriod, type MocoEarnedPeriod } from "@/lib/settlement-moco/cycle-period";

const BLOCKING_STATUSES: MocoSettlementCycleStatus[] = [
  MocoSettlementCycleStatus.PROCESSING,
  MocoSettlementCycleStatus.PAID,
];

export type LockSettlementCycleResult =
  | { ok: true; cycleId: string; lockedMoco: number }
  | { ok: false; reason: "none" | "duplicate" | "zero" };

async function ensurePlatformWallet(tx: Prisma.TransactionClient, userId: string) {
  const existing = await tx.platformWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.platformWallet.create({ data: { userId } });
}

/**
 * earned MOCO(Available) → 정산 주기(Processing) Lock + 메인 잔액 0.
 * 동일 user·period에 PROCESSING/PAID 가 있으면 스킵.
 */
export async function lockCreatorSettlementCycleInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  period: MocoEarnedPeriod,
): Promise<LockSettlementCycleResult> {
  const duplicate = await tx.creatorMocoSettlementCycle.findFirst({
    where: {
      userId,
      periodYear: period.periodYear,
      periodMonth: period.periodMonth,
      status: { in: BLOCKING_STATUSES },
    },
    select: { id: true },
  });
  if (duplicate) return { ok: false, reason: "duplicate" };

  const wallet = await ensurePlatformWallet(tx, userId);
  const available = wallet.settlementMocoPoints;
  if (available <= 0) return { ok: false, reason: "zero" };

  const cycle = await tx.creatorMocoSettlementCycle.create({
    data: {
      userId,
      periodYear: period.periodYear,
      periodMonth: period.periodMonth,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      lockedMoco: available,
      status: MocoSettlementCycleStatus.PROCESSING,
      scheduledPayAt: period.scheduledPayAt,
    },
  });

  const updated = await tx.platformWallet.update({
    where: { id: wallet.id },
    data: { settlementMocoPoints: 0 },
  });

  await tx.platformWalletLedger.create({
    data: {
      walletId: wallet.id,
      bucket: "SETTLEMENT_MOCO",
      delta: -available,
      balanceAfter: updated.settlementMocoPoints,
      reason: "월간 정산 Lock (Available → Processing)",
      referenceType: "moco_settlement_cycle",
      referenceId: cycle.id,
      metadata: {
        periodYear: period.periodYear,
        periodMonth: period.periodMonth,
      },
    },
  });

  await syncEarnedMocoDisplayTier(userId, updated.settlementMocoPoints, tx);

  return { ok: true, cycleId: cycle.id, lockedMoco: available };
}

export async function lockCreatorSettlementCycle(
  userId: string,
  period = previousMonthEarnedPeriod(),
): Promise<LockSettlementCycleResult> {
  return db.$transaction((tx) => lockCreatorSettlementCycleInTx(tx, userId, period));
}

export type LockAllCyclesSummary = {
  locked: number;
  skippedDuplicate: number;
  skippedZero: number;
  failed: number;
  period: MocoEarnedPeriod;
};

/** 정산일 — earned > 0 인 모든 크리에이터 Lock */
export async function lockAllCreatorSettlementCycles(
  asOf = new Date(),
  period = previousMonthEarnedPeriod(asOf),
): Promise<LockAllCyclesSummary> {
  const summary: LockAllCyclesSummary = {
    locked: 0,
    skippedDuplicate: 0,
    skippedZero: 0,
    failed: 0,
    period,
  };

  const wallets = await db.platformWallet.findMany({
    where: { settlementMocoPoints: { gt: 0 } },
    select: { userId: true },
  });

  for (const { userId } of wallets) {
    try {
      const result = await lockCreatorSettlementCycle(userId, period);
      if (result.ok) summary.locked++;
      else if (result.reason === "duplicate") summary.skippedDuplicate++;
      else if (result.reason === "zero") summary.skippedZero++;
    } catch {
      summary.failed++;
    }
  }

  return summary;
}
