import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { applyDueLegalSchedules } from "@/lib/legal/legal-document-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — apply legal documents whose 30-day schedule has elapsed. */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applied = await applyDueLegalSchedules();
  return NextResponse.json({ ok: true, applied });
}
