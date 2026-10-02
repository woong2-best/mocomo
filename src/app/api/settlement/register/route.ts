import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";

const DEPRECATED_BODY = {
  error:
    "Direct in-app bank registration (Custom Connect) is no longer supported. Use Stripe Express onboarding.",
  code: "CUSTOM_CONNECT_DEPRECATED",
  redirect: "/api/settlements/connect-account",
} as const;

/** @deprecated Custom Connect 제거 — POST /api/settlements/connect-account (Express) 사용 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlement-register", 5);
  if (limited) return limited;
  return NextResponse.json(DEPRECATED_BODY, { status: 410 });
}
