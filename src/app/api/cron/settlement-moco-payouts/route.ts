import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { processMonthlySettlementCron } from "@/lib/settlement-moco/payout";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** MonthlySettlementCron — 매월 1일 earnedMoco 등급 정산 · Reward 지급 · 잔여 이월 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processMonthlySettlementCron();
  return NextResponse.json({ ok: true, ...result });
}
