import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { runPlatformSchedulerTick } from "@/lib/platform/scheduler";
import { processPendingDeliveries } from "@/lib/platform/notification-center";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Vercel Cron — Platform Scheduler (Promotion · 만료 · 예약 · 알림 큐) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scheduler, deliveries] = await Promise.all([
    runPlatformSchedulerTick(),
    processPendingDeliveries(100),
  ]);

  return NextResponse.json({ ok: true, scheduler, deliveries });
}
