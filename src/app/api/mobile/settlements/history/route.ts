import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getUnifiedSettlementHistoryPage } from "@/lib/settlement-moco/history";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-history", 40);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw) || 20)) : 20;
  const cursor = req.nextUrl.searchParams.get("cursor");

  const page = await getUnifiedSettlementHistoryPage(authResult.user.id, { limit, cursor });
  return NextResponse.json(page);
}
