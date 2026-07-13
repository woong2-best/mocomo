import { NextRequest, NextResponse } from "next/server";
import { finalizeAllExpiredAuctions } from "@/actions/used-auction";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — 만료 경매 자동 마감 (Hobby: 1일 1회) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await finalizeAllExpiredAuctions(100);
  return NextResponse.json({ ok: true, ...result });
}
