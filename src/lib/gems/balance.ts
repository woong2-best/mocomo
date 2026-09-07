import { db } from "@/lib/db";

/** Recompute denormalized User.gemBalance from GemPurchase.remainingGems */
export async function syncUserGemBalance(fanId: string) {
  const agg = await db.gemPurchase.aggregate({
    where: { fanId, refunded: false },
    _sum: { remainingGems: true },
  });
  const balance = agg._sum.remainingGems ?? 0;
  await db.user.update({
    where: { id: fanId },
    data: { gemBalance: balance },
  });
  return balance;
}

export async function getUserGemBalance(fanId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: fanId },
    select: { gemBalance: true },
  });
  return user?.gemBalance ?? 0;
}
