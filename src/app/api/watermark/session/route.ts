import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyApiOrigin, rateLimitPublicApi } from "@/lib/api-security";
import { getWatermarkPublicConfig, isWatermarkEnabled } from "@/lib/watermark/config";
import {
  createWatermarkSession,
  WatermarkAccessError,
} from "@/lib/watermark/session/service";

export const dynamic = "force-dynamic";

/** GET /api/watermark/config — public feature flag + render constants */
export async function GET() {
  return NextResponse.json(getWatermarkPublicConfig());
}

/** POST /api/watermark/session — paid video playback session */
export async function POST(req: NextRequest) {
  if (!verifyApiOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const limited = await rateLimitPublicApi(req, "watermark-session", 30);
  if (limited) return limited;

  if (!isWatermarkEnabled()) {
    return NextResponse.json({ error: "Watermark disabled" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { contentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contentId = body.contentId?.trim();
  if (!contentId || contentId.length > 64) {
    return NextResponse.json({ error: "contentId required" }, { status: 400 });
  }

  try {
    const result = await createWatermarkSession(session.user.id, contentId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof WatermarkAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[watermark/session]", e);
    return NextResponse.json({ error: "Failed to create watermark session" }, { status: 500 });
  }
}
