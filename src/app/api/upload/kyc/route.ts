import { NextResponse } from "next/server";

/** @deprecated Stripe Connect Hosted Onboarding으로 대체 — 업로드 중단 */
export async function POST() {
  return NextResponse.json(
    { error: "신분증 업로드는 Stripe 온보딩에서 진행해 주세요." },
    { status: 410 }
  );
}
