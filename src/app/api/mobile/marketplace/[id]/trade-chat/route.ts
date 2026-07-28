import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { startMobileUsedTradeChat } from "@/lib/used-market-mobile";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-trade", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await startMobileUsedTradeChat(auth.user.id, id);
  if ("error" in result && result.error) {
    const status = "needsAdultVerify" in result && result.needsAdultVerify ? 403 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
