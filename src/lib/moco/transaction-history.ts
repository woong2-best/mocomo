/**
 * MOCO Burn + MocoTransactionHistory — 플랫폼 지갑 이체 없이 유저 잔액에서 직접 소멸
 */

import type { MocoTransactionType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { InsufficientGemsBalanceError, consumeGemPurchaseTenths } from "@/lib/gems/fifo";
import { joinMoco, joinSignedMoco, mocoToTenths, splitSignedTenths } from "@/lib/moco/decimal-amount";

type Tx = Prisma.TransactionClient;

export type RecordMocoBurnInput = {
  userId: string;
  amountMoco: number;
  type: MocoTransactionType;
  reason: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
};

async function consumePurchasedGemsTenths(tx: Tx, userId: string, tenths: number) {
  if (tenths <= 0) return;
  try {
    await consumeGemPurchaseTenths(tx, userId, tenths);
  } catch (err) {
    if (err instanceof InsufficientGemsBalanceError) throw new Error("INSUFFICIENT_MOCO");
    throw err;
  }
}

/** purchasedMoco(mocoPoints → gemBalance FIFO)에서 Burn + 원장 기록 (멱등) */
export async function burnPurchasedMocoWithHistory(
  tx: Tx,
  input: RecordMocoBurnInput
): Promise<{ recorded: boolean }> {
  const needTenths = mocoToTenths(input.amountMoco);
  if (needTenths == null) throw new Error("INVALID_MOCO_AMOUNT");

  const existing = await tx.mocoTransactionHistory.findUnique({
    where: {
      type_referenceId: { type: input.type, referenceId: input.referenceId },
    },
  });
  if (existing) return { recorded: false };

  const wallet =
    (await tx.platformWallet.findUnique({ where: { userId: input.userId } })) ??
    (await tx.platformWallet.create({ data: { userId: input.userId } }));

  const pointsAvailable = wallet.mocoPoints * 10 + wallet.mocoPointsTenths;
  const fromPointsTenths = Math.min(pointsAvailable, needTenths);
  const fromGemsTenths = needTenths - fromPointsTenths;

  if (fromPointsTenths > 0) {
    const next = pointsAvailable - fromPointsTenths;
    const moved = await tx.platformWallet.updateMany({
      where: {
        id: wallet.id,
        mocoPoints: wallet.mocoPoints,
        mocoPointsTenths: wallet.mocoPointsTenths,
      },
      data: {
        mocoPoints: Math.floor(next / 10),
        mocoPointsTenths: next % 10,
      },
    });
    if (moved.count === 0) throw new Error("INSUFFICIENT_MOCO");
  }

  if (fromGemsTenths > 0) {
    await consumePurchasedGemsTenths(tx, input.userId, fromGemsTenths);
  }

  const signed = splitSignedTenths(-needTenths);
  const fromPoints = joinMoco(0, fromPointsTenths);
  const fromGems = joinMoco(0, fromGemsTenths);

  await tx.mocoTransactionHistory.create({
    data: {
      userId: input.userId,
      amount: signed.whole,
      amountTenths: signed.tenths,
      type: input.type,
      reason: input.reason,
      referenceId: input.referenceId,
      metadata: {
        ...input.metadata,
        fromPoints,
        fromGems,
      } as Prisma.InputJsonValue,
    },
  });

  return { recorded: true };
}

/** lockedMocoBalance에서 Burn + 원장 기록 (Auction 페널티 등, 멱등) */
export async function burnLockedMocoWithHistory(
  tx: Tx,
  input: RecordMocoBurnInput
): Promise<{ recorded: boolean }> {
  if (input.amountMoco <= 0) throw new Error("INVALID_MOCO_AMOUNT");

  const existing = await tx.mocoTransactionHistory.findUnique({
    where: {
      type_referenceId: { type: input.type, referenceId: input.referenceId },
    },
  });
  if (existing) return { recorded: false };

  const wallet = await tx.platformWallet.findUnique({ where: { userId: input.userId } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");

  const balanceUpdated = await tx.platformWallet.updateMany({
    where: {
      id: wallet.id,
      lockedMocoBalance: { gte: input.amountMoco },
    },
    data: { lockedMocoBalance: { decrement: input.amountMoco } },
  });
  if (balanceUpdated.count === 0) throw new Error("FORFEIT_BALANCE_MISMATCH");

  await tx.mocoTransactionHistory.create({
    data: {
      userId: input.userId,
      amount: -input.amountMoco,
      type: input.type,
      reason: input.reason,
      referenceId: input.referenceId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  return { recorded: true };
}

export function adPurchaseReason(days: number): string {
  return `MoCoMo 광고 ${days}일 차감`;
}

export const AUCTION_PENALTY_REASON = "Auction win non-payment penalty deduction";

export async function listMocoTransactionHistory(userId: string, take = 50) {
  const rows = await db.mocoTransactionHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      amount: true,
      amountTenths: true,
      type: true,
      reason: true,
      referenceId: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    amount: joinSignedMoco(row.amount, row.amountTenths),
    type: row.type,
    reason: row.reason,
    referenceId: row.referenceId,
    createdAt: row.createdAt,
  }));
}
