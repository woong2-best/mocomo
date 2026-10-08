import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  boostPostAd,
  calcSponsoredAdMoco,
  getPostBoostStatus,
  SPONSORED_AD_DURATION_PRESETS,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_MOCO_PER_DAY,
} from "@/lib/sponsored-ad";

function serializeStatus(status: Awaited<ReturnType<typeof getPostBoostStatus>>) {
  return {
    mocoPerDay: SPONSORED_AD_MOCO_PER_DAY,
    maxDays: SPONSORED_AD_MAX_DAYS,
    presets: SPONSORED_AD_DURATION_PRESETS.map((days) => ({
      days,
      moco: calcSponsoredAdMoco(days),
    })),
    boostable: status.boostable,
    owned: status.owned,
    purchasedMoco: status.purchasedMoco,
    purchasedMocoBalance: status.purchasedMoco,
    active: status.active,
    campaign: status.campaign
      ? {
          ...status.campaign,
          startsAt: status.campaign.startsAt.toISOString(),
          expiresAt: status.campaign.expiresAt.toISOString(),
          createdAt: status.campaign.createdAt.toISOString(),
        }
      : null,
    refund: status.refund,
  };
}

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-ads-boost-status", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const postId = req.nextUrl.searchParams.get("postId")?.trim();
  if (!postId) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const status = await getPostBoostStatus(auth.user.id, postId);
  return NextResponse.json(serializeStatus(status));
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-ads-boost", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  let body: { postId?: string; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const postId = body.postId?.trim();
  const days = body.days;
  if (!postId) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }
  if (!Number.isInteger(days) || (days ?? 0) < 1) {
    return NextResponse.json({ error: "Select how many days to advertise." }, { status: 400 });
  }

  const result = await boostPostAd({
    userId: auth.user.id,
    postId,
    days: days!,
  });

  if (!result.ok) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    campaignId: result.campaignId,
    mocoPaid: result.mocoPaid,
    expiresAt: result.expiresAt.toISOString(),
  });
}
