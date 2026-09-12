import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { syncEarnedMocoDisplayTier } from "@/lib/settlement-moco/balance";

export type SettlementMocoBucket = "SETTLEMENT_MOCO";

export async function getSettlementMocoBalance(userId: string): Promise<number> {
  const wallet = await db.platformWallet.findUnique({
    where: { userId },
    select: { settlementMocoPoints: true },
  });
  return wallet?.settlementMocoPoints ?? 0;
}

/** @deprecated earned MOCO는 후원 1:1 적립 — FX 변환 사용 안 함 */
export function usdCentsToSettlementMoco(gems: number): number {
  return gems;
}

/** @deprecated earned MOCO는 후원 1:1 적립 */
export function krwToSettlementMoco(krw: number): number {
  return krw;
}

async function getOrCreatePlatformWallet(userId: string) {
  const existing = await db.platformWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.platformWallet.create({ data: { userId } });
}

/** 후원 완료 시 earnedMoco 적립 (purchasedMoco → earnedMoco 전환, 멱등) */
export async function creditSettlementMoco(input: {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (input.amount <= 0) return null;
  const wallet = await getOrCreatePlatformWallet(input.userId);

  const updated = await db.$transaction(async (tx) => {
    if (input.referenceType && input.referenceId) {
      const existing = await tx.platformWalletLedger.findFirst({
        where: {
          walletId: wallet.id,
          bucket: "SETTLEMENT_MOCO",
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          delta: { gt: 0 },
        },
      });
      if (existing) {
        return tx.platformWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      }
    }

    const row = await tx.platformWallet.update({
      where: { id: wallet.id },
      data: { settlementMocoPoints: { increment: input.amount } },
    });

    await tx.platformWalletLedger.create({
      data: {
        walletId: wallet.id,
        bucket: "SETTLEMENT_MOCO",
        delta: input.amount,
        balanceAfter: row.settlementMocoPoints,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await syncEarnedMocoDisplayTier(input.userId, row.settlementMocoPoints, tx);
    return row;
  });

  return updated;
}

/** 월간 정산 — achievedTier.requiredMoco 차감, 잔여 이월 */
export async function debitSettlementMocoForReward(input: {
  userId: string;
  deductAmount: number;
  batchId: string;
}) {
  if (input.deductAmount <= 0) return 0;
  const wallet = await getOrCreatePlatformWallet(input.userId);

  const rollover = await db.$transaction(async (tx) => {
    const current = await tx.platformWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const deduct = Math.min(current.settlementMocoPoints, input.deductAmount);
    if (deduct <= 0) return current.settlementMocoPoints;

    const updated = await tx.platformWallet.update({
      where: { id: wallet.id },
      data: { settlementMocoPoints: { decrement: deduct } },
    });

    await tx.platformWalletLedger.create({
      data: {
        walletId: wallet.id,
        bucket: "SETTLEMENT_MOCO",
        delta: -deduct,
        balanceAfter: updated.settlementMocoPoints,
        reason: "월간 정산 등급 차감",
        referenceType: "reward_payout_batch",
        referenceId: input.batchId,
      },
    });

    await syncEarnedMocoDisplayTier(input.userId, updated.settlementMocoPoints, tx);
    return updated.settlementMocoPoints;
  });

  return rollover;
}

/** @deprecated — tier 차감 방식으로 대체됨 */
export async function resetSettlementMoco(input: {
  userId: string;
  amount: number;
  batchId: string;
}) {
  return debitSettlementMocoForReward({
    userId: input.userId,
    deductAmount: input.amount,
    batchId: input.batchId,
  });
}
