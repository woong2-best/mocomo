import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import {
  notifyPromotionExpiries,
  runScheduledPromotionAssignments,
} from "@/lib/admin/services/promotions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Vercel Cron — 프로모션 만료 알림 + 예약 지급 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expiry, scheduled] = await Promise.all([
    notifyPromotionExpiries(),
    runScheduledPromotionAssignments(),
  ]);

  return NextResponse.json({ ok: true, expiry, scheduled });
}
