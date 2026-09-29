import { type NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { isPayoutTargetReady } from "@/lib/creator-payout-ready";

export const runtime = "nodejs";

/** 후원 UI — 수신자 Stripe payouts_enabled 여부만 반환 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "creator-payout-ready", 120);
  if (limited) return limited;

  const target = req.nextUrl.searchParams.get("target")?.trim() ?? "";
  if (!target || target.length > 64) {
    return NextResponse.json({ error: "target이 필요합니다." }, { status: 400 });
  }

  const payoutsEnabled = await isPayoutTargetReady(target);
  return NextResponse.json(
    { payoutsEnabled },
    { headers: { "Cache-Control": "no-store" } }
  );
}
