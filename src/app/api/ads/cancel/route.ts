import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { cancelPostBoost } from "@/lib/sponsored-ad";

/** POST — 진행 중 부스트 중단 + 일할 환불 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "ads-cancel", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

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
    userId: session.user.id,
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
