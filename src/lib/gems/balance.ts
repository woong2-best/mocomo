import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { joinMoco } from "@/lib/moco/decimal-amount";

type BalanceClient = Prisma.TransactionClient | typeof db;

/** Recompute denormalized User.gemBalance (+ tenths) from GemPurchase rows. */
export async function syncUserGemBalance(fanId: string, tx?: Prisma.TransactionClient) {
  const client: BalanceClient = tx ?? db;
  const agg = await client.gemPurchase.aggregate({
    where: { fanId, refunded: false },
    _sum: { remainingGems: true, remainingTenths: true },
  });
  const totalTenths = (agg._sum.remainingGems ?? 0) * 10 + (agg._sum.remainingTenths ?? 0);
  const gemBalance = Math.floor(totalTenths / 10);
  const gemBalanceTenths = totalTenths % 10;
  await client.user.update({
    where: { id: fanId },
    data: { gemBalance, gemBalanceTenths },
  });
  return joinMoco(gemBalance, gemBalanceTenths);
}

export async function getUserGemBalance(fanId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: fanId },
    select: { gemBalance: true, gemBalanceTenths: true },
  });
  return joinMoco(user?.gemBalance ?? 0, user?.gemBalanceTenths ?? 0);
}
