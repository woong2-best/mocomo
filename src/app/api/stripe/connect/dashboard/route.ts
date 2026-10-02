import { NextResponse } from "next/server";

/** @deprecated Custom 화이트라벨 — Stripe 대시보드 미사용 */
export async function GET() {
  return NextResponse.json(
    { error: "Manage payout accounts in MoCoMo My Page." },
    { status: 410 }
  );
}
