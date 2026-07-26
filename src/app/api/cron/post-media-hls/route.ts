import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { finalizePendingPostMediaHls } from "@/lib/post-media-hls";
import { isCloudflareStreamConfigured } from "@/lib/cloudflare-stream-vod";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — Cloudflare Stream VOD HLS finalize / backfill */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudflareStreamConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Cloudflare Stream not configured",
    });
  }

  const result = await finalizePendingPostMediaHls(20);
  return NextResponse.json({ ok: true, ...result });
}
