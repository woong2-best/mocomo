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
  parseSupportTierSlug,
} from "@/lib/tiers";
import { listCreatorsISupportedAtTier } from "@/lib/creator-support";

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
  const selectedTier = parseSupportTierSlug(req.nextUrl.searchParams.get("tier") ?? "");
  const supportedUsers = selectedTier
    ? await listCreatorsISupportedAtTier(auth.user.id, selectedTier)
    : [];

  return NextResponse.json({
    totalSupportSent: total,
    supportTierSent: user?.supportTierSent ?? "SEED",
    earnedMocoTier: user?.earnedMocoTier ?? "SEED",
    current: info,
    next,
    progress,
    selectedTier,
    supportedUsers,
    tiers: SUPPORT_TIERS.map((tierDef) => ({
      level: tierDef.level,
      label: tierDef.label,
      labelKo: tierDef.labelKo,
      minAmount: tierDef.minAmount,
      color: tierDef.color,
      iconUrl: `https://mocomo.net${tierDef.iconSrc}`,
    })),
  });
}
