import type { Prisma, SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { achievedSettlementTier } from "@/lib/settlement-moco/tier-config";
import { tierRank } from "@/lib/tiers";

type DbLike = Pick<typeof db, "platformWallet" | "user"> | Prisma.TransactionClient;

/** 구매 MOCO — 후원·미디어 소비용 (환불·인출·정산 등급 불가) */
export async function getPurchasedMoco(userId: string): Promise<number> {
  const [user, wallet] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { gemBalance: true } }),
    db.platformWallet.findUnique({ where: { userId }, select: { mocoPoints: true } }),
  ]);
  return (user?.gemBalance ?? 0) + (wallet?.mocoPoints ?? 0);
}

/** earned MOCO — 후원 수령·정산 대상 (PlatformWallet.settlementMocoPoints) */
export async function getEarnedMoco(userId: string): Promise<number> {
  const wallet = await db.platformWallet.findUnique({
    where: { userId },
    select: { settlementMocoPoints: true },
  });
  return wallet?.settlementMocoPoints ?? 0;
}

/** 프로필 뱃지용 — 보낸 등급 vs earned 등급 중 높은 쪽 */
export function resolveProfileDisplayTier(
  supportTierSent: SupportTierLevel,
  earnedMocoTier: SupportTierLevel
): SupportTierLevel {
  return tierRank(supportTierSent) >= tierRank(earnedMocoTier)
    ? supportTierSent
    : earnedMocoTier;
}

/** earnedMoco 잔액 기준 정산 등급 → User.earnedMocoTier 동기화 */
export async function syncEarnedMocoDisplayTier(
  userId: string,
  earnedMoco?: number,
  tx?: DbLike
) {
  const client = tx ?? db;
  const balance =
    earnedMoco ??
    (
      await client.platformWallet.findUnique({
        where: { userId },
        select: { settlementMocoPoints: true },
      })
    )?.settlementMocoPoints ??
    0;

  const tier = achievedSettlementTier(balance).tier;
  await client.user.update({
    where: { id: userId },
    data: { earnedMocoTier: tier },
  });
  return tier;
}
