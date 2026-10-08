import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { cancelPostBoost } from "@/lib/sponsored-ad";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-ads-cancel", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  let body: { postId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const postId = body.postId?.trim();
  if (!postId) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const result = await cancelPostBoost({
    userId: auth.user.id,
    postId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    campaignId: result.campaignId,
    refundMoco: result.refundMoco,
    usedDays: result.usedDays,
    unusedDays: result.unusedDays,
    totalDays: result.totalDays,
  });
}
