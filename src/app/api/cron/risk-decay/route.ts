import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { decayRiskScoresBatch } from "@/lib/risk-score";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — 30/60/90일 무위반 시 위험도 점수 감소 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await decayRiskScoresBatch();
  return NextResponse.json({ ok: true, ...result });
}
