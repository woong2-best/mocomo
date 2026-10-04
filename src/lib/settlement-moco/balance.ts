import type { Prisma, SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { tierFromAmount, tierRank } from "@/lib/tiers";
import { joinMoco } from "@/lib/moco/decimal-amount";

type DbLike = Pick<typeof db, "platformWallet" | "user"> | Prisma.TransactionClient;

/** 구매 MOCO — 후원·미디어 소비용 (환불·인출·정산 등급 불가) */
export async function getPurchasedMoco(userId: string): Promise<number> {
  const [user, wallet] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { gemBalance: true, gemBalanceTenths: true },
    }),
    db.platformWallet.findUnique({
      where: { userId },
      select: { mocoPoints: true, mocoPointsTenths: true },
    }),
  ]);
  return (
    joinMoco(user?.gemBalance ?? 0, user?.gemBalanceTenths ?? 0) +
    joinMoco(wallet?.mocoPoints ?? 0, wallet?.mocoPointsTenths ?? 0)
  );
}

/** earned MOCO — 후원 수령·정산 대상 (PlatformWallet.settlementMocoPoints) */
export async function getEarnedMoco(userId: string): Promise<number> {
  const wallet = await db.platformWallet.findUnique({
    where: { userId },
    select: { settlementMocoPoints: true, settlementMocoPointsTenths: true },
  });
  return joinMoco(wallet?.settlementMocoPoints ?? 0, wallet?.settlementMocoPointsTenths ?? 0);
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

/** earned MOCO 누적 → 후원 광석 뱃지 등급(User.earnedMocoTier). Reward 정산 등급과 별개. */
export async function syncEarnedMocoDisplayTier(
  userId: string,
  earnedMoco?: number,
  tx?: DbLike
) {
  const client = tx ?? db;
  const stored =
    earnedMoco == null
      ? await client.platformWallet.findUnique({
          where: { userId },
          select: { settlementMocoPoints: true, settlementMocoPointsTenths: true },
        })
      : null;
  const balance =
    earnedMoco ??
    joinMoco(stored?.settlementMocoPoints ?? 0, stored?.settlementMocoPointsTenths ?? 0);

  const tier = tierFromAmount(balance);
  await client.user.update({
    where: { id: userId },
    data: { earnedMocoTier: tier },
  });
  return tier;
}
