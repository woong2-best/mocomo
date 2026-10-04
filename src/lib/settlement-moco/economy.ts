import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { syncEarnedMocoDisplayTier } from "@/lib/settlement-moco/balance";
import {
  creditCreatorAllocationCents,
  creatorAllocationCentsFromMoco,
} from "@/lib/moco/topup-ledger";
import { splitMocoFaceValueCents } from "@/lib/moco/stripe-pass-through";
import { MOCO_USD_CENTS } from "@/lib/gems/constants";
import { splitCenti } from "@/lib/moco-donation/video-pricing";
import { joinMoco, mocoToTenths, splitUnsignedTenths } from "@/lib/moco/decimal-amount";

export type SettlementMocoBucket = "SETTLEMENT_MOCO";

export async function getSettlementMocoBalance(userId: string): Promise<number> {
  const wallet = await db.platformWallet.findUnique({
    where: { userId },
    select: { settlementMocoPoints: true, settlementMocoPointsTenths: true },
  });
  return joinMoco(wallet?.settlementMocoPoints ?? 0, wallet?.settlementMocoPointsTenths ?? 0);
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

export type CreditSettlementMocoInput = {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * 받은 MOCO는 settlementMocoPoints(Available)에만 넣는다.
 * gemBalance · mocoPoints(보유)는 절대 올리지 않는다.
 * 매월 25일 Lock 시점 이후 적립분은 다음 정산 주기에만 포함된다.
 */
export async function creditSettlementMocoInTx(
  tx: Prisma.TransactionClient,
  input: CreditSettlementMocoInput
) {
  const addTenths = mocoToTenths(input.amount);
  if (addTenths == null) return null;
  const existingWallet = await tx.platformWallet.findUnique({ where: { userId: input.userId } });
  const wallet =
    existingWallet ?? (await tx.platformWallet.create({ data: { userId: input.userId } }));

  if (input.referenceType && input.referenceId) {
    const existing = await tx.platformWalletLedger.findFirst({
      where: {
        walletId: wallet.id,
        bucket: "SETTLEMENT_MOCO",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        OR: [{ delta: { gt: 0 } }, { deltaTenths: { gt: 0 } }],
      },
    });
    if (existing) {
      return tx.platformWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    }
  }

  const next = splitUnsignedTenths(
    wallet.settlementMocoPoints * 10 + wallet.settlementMocoPointsTenths + addTenths
  );
  const delta = splitUnsignedTenths(addTenths);
  const row = await tx.platformWallet.update({
    where: { id: wallet.id },
    data: {
      settlementMocoPoints: next.whole,
      settlementMocoPointsTenths: next.tenths,
    },
  });

  await tx.platformWalletLedger.create({
    data: {
      walletId: wallet.id,
      bucket: "SETTLEMENT_MOCO",
      delta: delta.whole,
      deltaTenths: delta.tenths,
      balanceAfter: row.settlementMocoPoints,
      balanceAfterTenths: row.settlementMocoPointsTenths,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  await syncEarnedMocoDisplayTier(
    input.userId,
    joinMoco(row.settlementMocoPoints, row.settlementMocoPointsTenths),
    tx
  );
  await creditCreatorAllocationCents(
    tx,
    input.userId,
    creatorAllocationCentsFromMoco(input.amount)
  );
  return row;
}

/** Video-donation settlement in 0.01 MOCO units. Idempotent per reference id. */
export async function creditSettlementMocoCentiInTx(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    centi: number;
    reason: string;
    referenceType: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (!Number.isInteger(input.centi) || input.centi <= 0) return null;
  const existingWallet = await tx.platformWallet.findUnique({ where: { userId: input.userId } });
  const wallet =
    existingWallet ?? (await tx.platformWallet.create({ data: { userId: input.userId } }));

  const existing = await tx.platformWalletLedger.findFirst({
    where: {
      walletId: wallet.id,
      bucket: "SETTLEMENT_MOCO",
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      OR: [{ delta: { gt: 0 } }, { deltaTenths: { gt: 0 } }, { deltaHundredths: { gt: 0 } }],
    },
  });
  if (existing) return wallet;

  const total =
    wallet.settlementMocoPoints * 100 +
    wallet.settlementMocoPointsTenths * 10 +
    wallet.settlementMocoPointsHundredths +
    input.centi;
  const whole = Math.floor(total / 100);
  const rem = total % 100;
  const delta = splitCenti(input.centi);
  const row = await tx.platformWallet.update({
    where: { id: wallet.id },
    data: {
      settlementMocoPoints: whole,
      settlementMocoPointsTenths: Math.floor(rem / 10),
      settlementMocoPointsHundredths: rem % 10,
    },
  });

  await tx.platformWalletLedger.create({
    data: {
      walletId: wallet.id,
      bucket: "SETTLEMENT_MOCO",
      delta: delta.whole,
      deltaTenths: delta.tenths,
      deltaHundredths: delta.hundredths,
      balanceAfter: row.settlementMocoPoints,
      balanceAfterTenths: row.settlementMocoPointsTenths,
      balanceAfterHundredths: row.settlementMocoPointsHundredths,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  await syncEarnedMocoDisplayTier(input.userId, total / 100, tx);
  await creditCreatorAllocationCents(
    tx,
    input.userId,
    splitMocoFaceValueCents(input.centi * (MOCO_USD_CENTS / 100)).creatorAllocationCents
  );
  return row;
}

/** 후원·전달 수령 시 earnedMoco 적립 (보유 MOCO에는 넣지 않음, 멱등) */
export async function creditSettlementMoco(input: CreditSettlementMocoInput) {
  if (mocoToTenths(input.amount) == null) return null;
  await getOrCreatePlatformWallet(input.userId);
  return db.$transaction((tx) => creditSettlementMocoInTx(tx, input));
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
        deltaTenths: 0,
        balanceAfter: updated.settlementMocoPoints,
        balanceAfterTenths: updated.settlementMocoPointsTenths,
        reason: "Monthly settlement tier deduction",
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
