import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";

const DEPRECATED_BODY = {
  error:
    "앱 내 계좌 직접 등록(Custom Connect)은 더 이상 지원하지 않습니다. Stripe Express 온보딩을 이용해 주세요.",
  code: "CUSTOM_CONNECT_DEPRECATED",
  redirect: "/api/mobile/settlements/connect-account",
} as const;

/** @deprecated Custom Connect 제거 — POST /api/mobile/settlements/connect-account 사용 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-register", 5);
  if (limited) return limited;
  return NextResponse.json(DEPRECATED_BODY, { status: 410 });
}
