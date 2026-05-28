import type { SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { tierFromAmount, SUPPORT_TIERS } from "@/lib/tiers";

export type LiveVisibility = "PUBLIC" | "PRIVATE";

function tierRank(level: SupportTierLevel): number {
  return SUPPORT_TIERS.findIndex((t) => t.level === level);
}

/** 크리에이터에게 보낸 누적 후원으로 시청 등급 판정 */
export async function getSupporterTierToCreator(
  senderId: string,
  creatorId: string
): Promise<SupportTierLevel> {
  try {
    const sum = await db.tip.aggregate({
      where: { senderId, receiverId: creatorId },
      _sum: { amount: true },
    });
    return tierFromAmount(sum._sum.amount ?? 0);
  } catch {
    return "PEBBLE";
  }
}

export async function meetsPrivateLiveTier(
  viewerId: string,
  creatorId: string,
  minTier: SupportTierLevel
): Promise<boolean> {
  if (viewerId === creatorId) return true;
  const viewerTier = await getSupporterTierToCreator(viewerId, creatorId);
  return tierRank(viewerTier) >= tierRank(minTier);
}

export function tierLabelKo(level: SupportTierLevel): string {
  return SUPPORT_TIERS.find((t) => t.level === level)?.labelKo ?? level;
}
