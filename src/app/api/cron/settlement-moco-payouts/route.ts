import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { processMonthlySettlementCron } from "@/lib/settlement-moco/payout";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** MonthlySettlementCron — 매월 25일(KST) Lock + Reward 지급 (그 외 날은 보류 배치 재시도·PROCESSING 지급만) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const result = await processMonthlySettlementCron(new Date(), { forceLock: force });
  return NextResponse.json({
    ok: true,
    processed: result.processed,
    skipped: result.skipped,
    failed: result.failed,
    tierSkipped: result.tierSkipped,
    retried: result.retried,
    locked: result.locked,
    lockSkippedDuplicate: result.lockSkippedDuplicate,
    lockSkippedZero: result.lockSkippedZero,
    lockFailed: result.lockFailed,
    onDemandMode: result.onDemandMode,
    deprecatedCyclesReleased: result.deprecatedCyclesReleased,
  });
}
