import { NextRequest, NextResponse } from "next/server";
import { handleIapVoidOrRefund } from "@/lib/apt/economy/iap/iap-refund-service";
import { listVoidedGooglePurchases } from "@/lib/apt/economy/iap/google-play-verifier";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — Google voided purchase 폴링 (1시간마다) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await listVoidedGooglePurchases({
    startTimeMs: Date.now() - 24 * 60 * 60 * 1000,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  let handled = 0;
  for (const v of result.voided) {
    const r = await handleIapVoidOrRefund({
      orderId: v.orderId,
      purchaseToken: v.purchaseToken,
      reason: "Voided purchase cron poll",
    });
    if ("ok" in r) handled++;
  }

  return NextResponse.json({ ok: true, voided: result.voided.length, handled });
}
