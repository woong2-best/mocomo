import { NextResponse } from "next/server";

/** @deprecated Custom 화이트라벨 — Stripe 대시보드 미사용 */
export async function GET() {
  return NextResponse.json(
    { error: "정산 계좌는 MoCoMo 마이페이지에서 관리합니다." },
    { status: 410 }
  );
}
