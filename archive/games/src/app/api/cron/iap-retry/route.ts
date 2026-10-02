import { NextRequest, NextResponse } from "next/server";
import { processIapRetryQueue } from "@/lib/apt/economy/iap/iap-retry-service";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — IAP Ack/Fulfill 재시도 큐 (5분마다) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processIapRetryQueue(50);
  return NextResponse.json({ ok: true, processed });
}
