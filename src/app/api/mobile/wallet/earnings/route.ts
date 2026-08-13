import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getWalletEarningsAnalytics } from "@/lib/wallet-analytics";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-wallet-earnings", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;

  const analytics = await getWalletEarningsAnalytics(auth.user.id, year);
  return NextResponse.json(analytics);
}
