import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { processCreatorPayouts } from "@/lib/gems/payout";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Cron — aggregate GiftEvents → CreatorPayoutBatch → Stripe Transfer (batch, not per-event) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await processCreatorPayouts();
  return NextResponse.json({ ok: true, ...result });
}
