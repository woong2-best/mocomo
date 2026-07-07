import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredDeletedAccounts } from "@/lib/account-deletion-server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Vercel Cron — 복구 기간(50일)이 지난 탈퇴 계정 영구 삭제 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purged = await purgeExpiredDeletedAccounts();
  return NextResponse.json({ ok: true, purged });
}
