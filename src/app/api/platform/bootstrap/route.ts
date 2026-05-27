import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensurePlatformBootstrap } from "@/lib/platform-bootstrap";
import { isProduction, rateLimitPublicApi, verifyInternalSecret } from "@/lib/api-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    const limited = await rateLimitPublicApi(req, "bootstrap", 5);
    if (limited) return limited;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ensurePlatformBootstrap(db);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[platform/bootstrap]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
