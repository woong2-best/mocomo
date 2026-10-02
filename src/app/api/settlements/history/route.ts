import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getUnifiedSettlementHistoryPage } from "@/lib/settlement-moco/history";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlement-history", 40);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw) || 20)) : 20;
  const cursor = req.nextUrl.searchParams.get("cursor");

  const page = await getUnifiedSettlementHistoryPage(session.user.id, { limit, cursor });
  return NextResponse.json(page);
}
