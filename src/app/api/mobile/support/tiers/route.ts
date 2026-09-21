import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import {
  SUPPORT_TIERS,
  tierFromAmount,
  getNextTierInfo,
  getTierInfo,
  getTierDetailProgress,
} from "@/lib/tiers";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-support-tiers", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { totalSupportSent: true, supportTierSent: true, earnedMocoTier: true },
  });

  const total = user?.totalSupportSent ?? 0;
  const level = tierFromAmount(total);
  const info = getTierInfo(level);
  const next = getNextTierInfo(total);
  const progress = getTierDetailProgress(level, total);

  return NextResponse.json({
    totalSupportSent: total,
    supportTierSent: user?.supportTierSent ?? "SEED",
    earnedMocoTier: user?.earnedMocoTier ?? "SEED",
    current: info,
    next,
    progress,
    tiers: SUPPORT_TIERS.map((t) => ({
      level: t.level,
      label: t.label,
      labelKo: t.labelKo,
      minAmount: t.minAmount,
      color: t.color,
      iconUrl: `https://mocomo.net${t.iconSrc}`,
    })),
  });
}
