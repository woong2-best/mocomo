import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { redeemCouponCode } from "@/lib/admin/services/coupons";

export const dynamic = "force-dynamic";

/**
 * POST /api/coupons/apply
 * body: { code } — 사용자가 쿠폰 코드 입력
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "coupons-apply", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as { code?: string };
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  try {
    const res = await redeemCouponCode(session.user.id, code);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, assignment: res.assignment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
