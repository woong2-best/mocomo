import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit";
import {
  calcSponsoredAdMoco,
  getSponsoredAdStatus,
  SPONSORED_AD_MOCO_PER_DAY,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_TARGET_EVENT,
  type SponsoredAdTargetType,
} from "@/lib/sponsored-ad";

/** GET — 모바일 스폰서드 광고 상태 + purchasedMoco 잔액 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-sponsored-ad-status", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const targetType = (req.nextUrl.searchParams.get("targetType")?.trim() ??
    SPONSORED_AD_TARGET_EVENT) as SponsoredAdTargetType;
  const targetId = req.nextUrl.searchParams.get("targetId")?.trim();
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? Number.parseInt(daysParam, 10) : null;

  const [balance, status] = await Promise.all([
    getMocoBalanceSnapshot(auth.user.id),
    targetId ? getSponsoredAdStatus(targetType, targetId) : Promise.resolve({ active: false, campaign: null }),
  ]);

  let quoteMoco: number | null = null;
  if (days && Number.isInteger(days) && days >= 1 && days <= SPONSORED_AD_MAX_DAYS) {
    try {
      quoteMoco = calcSponsoredAdMoco(days);
    } catch {
      quoteMoco = null;
    }
  }

  return NextResponse.json({
    mocoPerDay: SPONSORED_AD_MOCO_PER_DAY,
    maxDays: SPONSORED_AD_MAX_DAYS,
    purchasedMocoBalance: balance.availableMocoBalance,
    quoteMoco,
    canAfford: quoteMoco != null ? balance.availableMocoBalance >= quoteMoco : null,
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
