import { NextRequest, NextResponse } from "next/server";
import { autoEndAbandonedLiveChannels } from "@/lib/live-abandon";
import { autoEndExternalPlatformOffChannels } from "@/lib/live-external/sync-platform-end";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — 24시간 방치된 LIVE 자동 종료 (매시간) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ended, externalEnded] = await Promise.all([
    autoEndAbandonedLiveChannels(),
    autoEndExternalPlatformOffChannels(),
  ]);
  return NextResponse.json({ ok: true, ended, externalEnded });
}
