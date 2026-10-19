import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlements-connect", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  return NextResponse.json(
    {
      error:
        "Creator payouts are sent manually. Upload a W-9 or W-8BEN and a Payoneer, Wise, or bank destination in your wallet.",
      code: "CONNECT_PAYOUT_RETIRED",
    },
    { status: 410 },
  );
}
