import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  purchaseSponsoredAd,
  SPONSORED_AD_TARGET_EVENT,
  type SponsoredAdTargetType,
} from "@/lib/sponsored-ad";

const ALLOWED_TARGETS = new Set<SponsoredAdTargetType>([SPONSORED_AD_TARGET_EVENT]);

/** POST — 스폰서드 광고 MOCO 결제 (24h = 1 MOCO) */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "sponsored-ad-purchase", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  let body: { targetType?: string; targetId?: string; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const targetType = body.targetType?.trim() as SponsoredAdTargetType | undefined;
  const targetId = body.targetId?.trim();
  const days = body.days;

  if (!targetType || !ALLOWED_TARGETS.has(targetType)) {
    return NextResponse.json({ error: "Unsupported ad target." }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }
  if (!Number.isInteger(days) || (days ?? 0) < 1) {
    return NextResponse.json({ error: "Select how many days to advertise." }, { status: 400 });
  }

  const result = await purchaseSponsoredAd({
    userId: session.user.id,
    targetType,
    targetId,
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
