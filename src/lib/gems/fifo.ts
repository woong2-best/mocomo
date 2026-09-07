import type { Prisma } from "@prisma/client";

type PrismaTransaction = Prisma.TransactionClient;

export class InsufficientGemsBalanceError extends Error {
  constructor() {
    super("INSUFFICIENT_GEMS_BALANCE");
    this.name = "InsufficientGemsBalanceError";
  }
}

/** FIFO gem consumption — oldest GemPurchase first */
export async function consumeGemsFifo(
  fanId: string,
  gemsToConsume: number,
  giftEventId: string,
  tx: PrismaTransaction
) {
  if (!Number.isInteger(gemsToConsume) || gemsToConsume <= 0) {
    throw new Error("INVALID_GEMS_AMOUNT");
  }

  const purchases = await tx.gemPurchase.findMany({
    where: { fanId, remainingGems: { gt: 0 }, refunded: false },
    orderBy: { createdAt: "asc" },
  });

  const totalAvailable = purchases.reduce((sum, p) => sum + p.remainingGems, 0);
  if (totalAvailable < gemsToConsume) {
    throw new InsufficientGemsBalanceError();
  }

  let remainingToDeduct = gemsToConsume;

  for (const purchase of purchases) {
    if (remainingToDeduct <= 0) break;

    const deduct = Math.min(purchase.remainingGems, remainingToDeduct);

    await tx.gemPurchase.update({
      where: { id: purchase.id },
      data: { remainingGems: purchase.remainingGems - deduct },
    });

    await tx.giftEventAllocation.create({
      data: {
        giftEventId,
        gemPurchaseId: purchase.id,
        gemsUsed: deduct,
      },
    });

    remainingToDeduct -= deduct;
  }
}
