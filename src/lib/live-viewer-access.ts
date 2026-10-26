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
    const row = await db.creatorSupport.findUnique({
      where: { supporterId_creatorId: { supporterId: senderId, creatorId } },
      select: { totalAmount: true },
    });
    return tierFromAmount(row?.totalAmount ?? 0);
  } catch {
    return "SEED";
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

export function tierLabelEn(level: SupportTierLevel): string {
  return SUPPORT_TIERS.find((t) => t.level === level)?.label ?? level;
}
