import { NextRequest, NextResponse } from "next/server";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";
import { rateLimitPublicApi } from "@/lib/api-security";
import { buildOverlayChatFeed } from "@/lib/live-external/overlay-feed";

export const dynamic = "force-dynamic";

/** OBS 전용 — MoCoMo + 플랫폼 채팅을 한 번에 반환. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-feed", 120);
  if (limited) return limited;

  const { channelId } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const verified = verifyOverlayToken(token, { channelId, kind: "chat" });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const result = await buildOverlayChatFeed({
    channelId,
    tokenPayload: verified.payload,
    since: req.nextUrl.searchParams.get("since"),
    pageToken: req.nextUrl.searchParams.get("pageToken"),
    liveChatId: req.nextUrl.searchParams.get("liveChatId"),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
