import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";

const DEPRECATED_BODY = {
  error:
    "Creator payouts are sent manually. Upload a W-9 or W-8BEN and a Payoneer, Wise, or bank destination in your wallet.",
  code: "CONNECT_PAYOUT_RETIRED",
} as const;

/** Creator payout registration no longer creates a Stripe Connect account. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-register", 5);
  if (limited) return limited;
  return NextResponse.json(DEPRECATED_BODY, { status: 410 });
}
