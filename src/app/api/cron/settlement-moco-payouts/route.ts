import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { processMonthlySettlementCron } from "@/lib/settlement-moco/payout";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Retired. Monthly Reward lock no longer runs. Wallet tier payouts are requested by the creator. */
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
