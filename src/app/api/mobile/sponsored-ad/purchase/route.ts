import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  purchaseSponsoredAd,
  SPONSORED_AD_TARGET_EVENT,
  type SponsoredAdTargetType,
} from "@/lib/sponsored-ad";

const ALLOWED_TARGETS = new Set<SponsoredAdTargetType>([SPONSORED_AD_TARGET_EVENT]);

/** POST — 모바일 스폰서드 광고 MOCO 결제 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-sponsored-ad-purchase", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  let body: { targetType?: string; targetId?: string; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const targetType = body.targetType?.trim() as SponsoredAdTargetType | undefined;
  const targetId = body.targetId?.trim();
  const days = body.days;

  if (!targetType || !ALLOWED_TARGETS.has(targetType)) {
    return NextResponse.json({ error: "지원하지 않는 광고 대상입니다." }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: "대상 ID가 필요합니다." }, { status: 400 });
  }
  if (!Number.isInteger(days) || (days ?? 0) < 1) {
    return NextResponse.json({ error: "광고 일수를 선택해 주세요." }, { status: 400 });
  }

  const result = await purchaseSponsoredAd({
    userId: auth.user.id,
    targetType,
    targetId,
    days: days!,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    campaignId: result.campaignId,
    mocoPaid: result.mocoPaid,
    expiresAt: result.expiresAt.toISOString(),
  });
}
