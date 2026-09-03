import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import {
  processAutoDisputeRulesBatch,
  processNoShipAutoRefundBatch,
} from "@/lib/marketplace/auto-dispute-rules";
import { syncRollingReserveBatch } from "@/lib/marketplace/stripe-connect-reserve";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** P3: auto dispute rules + no-ship refund + Connect rolling reserve sync */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [disputes, noShip, reserve] = await Promise.all([
    processAutoDisputeRulesBatch(40),
    processNoShipAutoRefundBatch(30),
    syncRollingReserveBatch(50),
  ]);

  return NextResponse.json({
    ok: true,
    autoDisputes: disputes,
    noShipRefunds: noShip,
    reserveSync: reserve,
  });
}
