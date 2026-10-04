import type { Prisma } from "@prisma/client";
import { syncUserGemBalance } from "@/lib/gems/balance";
import { mocoToTenths, splitUnsignedTenths } from "@/lib/moco/decimal-amount";

type PrismaTransaction = Prisma.TransactionClient;

export class InsufficientGemsBalanceError extends Error {
  constructor() {
    super("INSUFFICIENT_GEMS_BALANCE");
    this.name = "InsufficientGemsBalanceError";
  }
}

/** Debit purchased GemPurchase rows in 0.1 MOCO steps (oldest first). */
export async function consumeGemPurchaseTenths(
  tx: PrismaTransaction,
  fanId: string,
  tenthsToConsume: number,
  onDeduct?: (input: { gemPurchaseId: string; tenths: number }) => Promise<void>
) {
  if (!Number.isInteger(tenthsToConsume) || tenthsToConsume <= 0) {
    throw new Error("INVALID_GEMS_AMOUNT");
  }

  const purchases = await tx.gemPurchase.findMany({
    where: {
      fanId,
      refunded: false,
      OR: [{ remainingGems: { gt: 0 } }, { remainingTenths: { gt: 0 } }],
    },
    orderBy: { createdAt: "asc" },
  });

  let remaining = tenthsToConsume;

  for (const purchase of purchases) {
    if (remaining <= 0) break;
    const available = purchase.remainingGems * 10 + purchase.remainingTenths;
    if (available <= 0) continue;
    const deduct = Math.min(available, remaining);
    const next = available - deduct;

    await tx.gemPurchase.update({
      where: { id: purchase.id },
      data: {
        remainingGems: Math.floor(next / 10),
        remainingTenths: next % 10,
      },
    });

    if (onDeduct) await onDeduct({ gemPurchaseId: purchase.id, tenths: deduct });
    remaining -= deduct;
  }

  if (remaining > 0) throw new InsufficientGemsBalanceError();
  await syncUserGemBalance(fanId, tx);
}

/** FIFO gem consumption — oldest GemPurchase first. Accepts 0.1 MOCO. */
export async function consumeGemsFifo(
  fanId: string,
  gemsToConsume: number,
  giftEventId: string,
  tx: PrismaTransaction
) {
  const tenths = mocoToTenths(gemsToConsume);
  if (tenths == null) throw new Error("INVALID_GEMS_AMOUNT");

  await consumeGemPurchaseTenths(tx, fanId, tenths, async ({ gemPurchaseId, tenths: used }) => {
    const parts = splitUnsignedTenths(used);
    await tx.giftEventAllocation.create({
      data: {
        giftEventId,
        gemPurchaseId,
        gemsUsed: parts.whole,
        gemsUsedTenths: parts.tenths,
      },
    });
  });
}
