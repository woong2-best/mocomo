import { NextResponse } from "next/server";

/** @deprecated Express 온보딩 제거 — /api/settlement/register 사용 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Stripe 온보딩 페이지는 사용하지 않습니다. 마이페이지에서 Reward 정산 등록을 완료해 주세요.",
    },
    { status: 410 }
  );
}
