import { NextRequest, NextResponse } from "next/server";

import { syncSubcultureEventsIfDue } from "@/lib/subculture-events";

/** KR/JP 공식 사이트 자동 수집 — Vercel cron 1시간마다 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncSubcultureEventsIfDue({
      force: true,
      geocodeMax: 8,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/subculture-events]", e);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
