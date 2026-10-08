import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  getSponsoredAdStatus,
  SPONSORED_AD_MOCO_PER_DAY,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_TARGET_EVENT,
  SPONSORED_AD_TARGET_POST,
  type SponsoredAdTargetType,
} from "@/lib/sponsored-ad";

const ALLOWED_TARGETS = new Set<SponsoredAdTargetType>([
  SPONSORED_AD_TARGET_EVENT,
  SPONSORED_AD_TARGET_POST,
]);

/** GET — 스폰서드 광고 상태·요금 안내 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "sponsored-ad-status", 60);
  if (limited) return limited;

  const targetTypeRaw = (req.nextUrl.searchParams.get("targetType")?.trim() ??
    SPONSORED_AD_TARGET_EVENT) as SponsoredAdTargetType;
  const targetType = ALLOWED_TARGETS.has(targetTypeRaw)
    ? targetTypeRaw
    : SPONSORED_AD_TARGET_EVENT;
  const targetId = req.nextUrl.searchParams.get("targetId")?.trim();

  if (!targetId) {
    return NextResponse.json({
      mocoPerDay: SPONSORED_AD_MOCO_PER_DAY,
      maxDays: SPONSORED_AD_MAX_DAYS,
      active: false,
      campaign: null,
    });
  }

  const status = await getSponsoredAdStatus(targetType, targetId);

  return NextResponse.json({
    mocoPerDay: SPONSORED_AD_MOCO_PER_DAY,
    maxDays: SPONSORED_AD_MAX_DAYS,
    ...status,
    campaign: status.campaign
      ? {
          ...status.campaign,
          startsAt: status.campaign.startsAt.toISOString(),
          expiresAt: status.campaign.expiresAt.toISOString(),
          createdAt: status.campaign.createdAt.toISOString(),
        }
      : null,
  });
}
