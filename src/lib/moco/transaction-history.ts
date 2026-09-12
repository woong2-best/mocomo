/**
 * MOCO Burn + MocoTransactionHistory — 플랫폼 지갑 이체 없이 유저 잔액에서 직접 소멸
 */

import type { MocoTransactionType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient;

export type RecordMocoBurnInput = {
  userId: string;
  amountMoco: number;
  type: MocoTransactionType;
  reason: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
};

async function consumePurchasedGemsFifo(tx: Tx, userId: string, gems: number) {
  if (gems <= 0) return;
  const purchases = await tx.gemPurchase.findMany({
    where: { fanId: userId, remainingGems: { gt: 0 }, refunded: false },
    orderBy: { createdAt: "asc" },
  });
  let remaining = gems;
  for (const purchase of purchases) {
    if (remaining <= 0) break;
    const deduct = Math.min(purchase.remainingGems, remaining);
    await tx.gemPurchase.update({
      where: { id: purchase.id },
      data: { remainingGems: purchase.remainingGems - deduct },
    });
    remaining -= deduct;
  }
  if (remaining > 0) throw new Error("INSUFFICIENT_MOCO");

  const agg = await tx.gemPurchase.aggregate({
    where: { fanId: userId, refunded: false },
    _sum: { remainingGems: true },
  });
  await tx.user.update({
    where: { id: userId },
    data: { gemBalance: agg._sum.remainingGems ?? 0 },
  });
}

/** purchasedMoco(mocoPoints → gemBalance FIFO)에서 Burn + 원장 기록 (멱등) */
export async function burnPurchasedMocoWithHistory(
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

  const wallet =
    (await tx.platformWallet.findUnique({ where: { userId: input.userId } })) ??
    (await tx.platformWallet.create({ data: { userId: input.userId } }));

  const fromPoints = Math.min(wallet.mocoPoints, input.amountMoco);
  const fromGems = input.amountMoco - fromPoints;

  if (fromPoints > 0) {
    const moved = await tx.platformWallet.updateMany({
      where: { id: wallet.id, mocoPoints: { gte: fromPoints } },
      data: { mocoPoints: { decrement: fromPoints } },
    });
    if (moved.count === 0) throw new Error("INSUFFICIENT_MOCO");
  }

  if (fromGems > 0) {
    await consumePurchasedGemsFifo(tx, input.userId, fromGems);
  }

  await tx.mocoTransactionHistory.create({
    data: {
      userId: input.userId,
      amount: -input.amountMoco,
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

/** lockedMocoBalance에서 Burn + 원장 기록 (경매 페널티 등, 멱등) */
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

export const AUCTION_PENALTY_REASON = "경매 낙찰 미결제 페널티 차감";

export async function listMocoTransactionHistory(userId: string, take = 50) {
  return db.mocoTransactionHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      amount: true,
      type: true,
      reason: true,
      referenceId: true,
      createdAt: true,
    },
  });
}
