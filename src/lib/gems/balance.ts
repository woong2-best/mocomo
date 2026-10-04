import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type BalanceClient = Prisma.TransactionClient | typeof db;

/** Recompute denormalized User.gemBalance (+ tenths) from GemPurchase rows. */
export async function syncUserGemBalance(fanId: string, tx?: Prisma.TransactionClient) {
  const client: BalanceClient = tx ?? db;
  const agg = await client.gemPurchase.aggregate({
    where: { fanId, refunded: false },
    _sum: { remainingGems: true, remainingTenths: true, remainingHundredths: true },
  });
  const totalCenti =
    (agg._sum.remainingGems ?? 0) * 100 +
    (agg._sum.remainingTenths ?? 0) * 10 +
    (agg._sum.remainingHundredths ?? 0);
  const gemBalance = Math.floor(totalCenti / 100);
  const rem = totalCenti % 100;
  const gemBalanceTenths = Math.floor(rem / 10);
  const gemBalanceHundredths = rem % 10;
  await client.user.update({
    where: { id: fanId },
    data: { gemBalance, gemBalanceTenths, gemBalanceHundredths },
  });
  return totalCenti / 100;
}

export async function getUserGemBalance(fanId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: fanId },
    select: { gemBalance: true, gemBalanceTenths: true, gemBalanceHundredths: true },
  });
  const centi =
    (user?.gemBalance ?? 0) * 100 +
    (user?.gemBalanceTenths ?? 0) * 10 +
    (user?.gemBalanceHundredths ?? 0);
  return centi / 100;
}
