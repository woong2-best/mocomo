import { NextRequest, NextResponse } from "next/server";
import { verifyApiOrigin, rateLimitPublicApi } from "@/lib/api-security";
import { getWatermarkPublicConfig, isWatermarkEnabled } from "@/lib/watermark/config";
import {
  createWatermarkSession,
  WatermarkAccessError,
} from "@/lib/watermark/session/service";
import { getWatermarkViewerUserId } from "@/lib/watermark/request-auth";
import { getMobileUserId } from "@/lib/api-mobile-auth";

export const dynamic = "force-dynamic";

/** GET /api/watermark/config — public feature flag + render constants */
export async function GET() {
  return NextResponse.json(getWatermarkPublicConfig());
}

/** POST /api/watermark/session — paid video playback session */
export async function POST(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  if (!mobileUserId && !verifyApiOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const limited = await rateLimitPublicApi(req, "watermark-session", 30);
  if (limited) return limited;

  if (!isWatermarkEnabled()) {
    return NextResponse.json({ error: "Watermark disabled" }, { status: 503 });
  }

  const userId = mobileUserId ?? (await getWatermarkViewerUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { contentId?: string; contentKind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contentId = body.contentId?.trim();
  if (!contentId || contentId.length > 64) {
    return NextResponse.json({ error: "contentId required" }, { status: 400 });
  }
  const contentKind = body.contentKind === "EPISODE" ? "EPISODE" : "POST_MEDIA";

  try {
    const result = await createWatermarkSession(userId, contentId, contentKind);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof WatermarkAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[watermark/session]", e);
    return NextResponse.json({ error: "Failed to create watermark session" }, { status: 500 });
  }
}
