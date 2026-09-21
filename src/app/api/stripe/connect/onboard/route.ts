import { NextResponse } from "next/server";

/** @deprecated — POST /api/settlements/connect-account (Express Hosted Onboarding) 사용 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "이 엔드포인트는 더 이상 사용되지 않습니다. /api/settlements/connect-account 로 Stripe Express 온보딩을 시작해 주세요.",
      code: "LEGACY_CONNECT_ONBOARD_DEPRECATED",
      redirect: "/api/settlements/connect-account",
    },
    { status: 410 }
  );
}
