import { NextResponse } from "next/server";

/** @deprecated Stripe Connect Hosted Onboarding으로 대체 — 업로드 중단 */
export async function POST() {
  return NextResponse.json(
    { error: "Upload ID documents during Stripe onboarding." },
    { status: 410 }
  );
}
