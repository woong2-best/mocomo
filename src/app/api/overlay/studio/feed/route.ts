import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { buildOverlayChatFeed } from "@/lib/live-external/overlay-feed";
import { authorizeStudioOverlay } from "@/lib/live-external/studio-obs-url";

export const dynamic = "force-dynamic";

const idle = {
  live: false,
  messages: [],
  meta: null,
  platformReady: false,
  platformError: null,
  channelId: null,
};

/** Live Studio OBS chat. Follows the host's current broadcast. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "overlay-studio-feed", 120);
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const auth = await authorizeStudioOverlay(token, "chat");
  if (!auth.ok) {
    return NextResponse.json({ error: errorText(auth.error) }, { status: 401 });
  }
  if (!auth.channel) return NextResponse.json(idle);

  const result = await buildOverlayChatFeed({
    channelId: auth.channel.id,
    tokenPayload: auth.payload,
    since: req.nextUrl.searchParams.get("since"),
    pageToken: req.nextUrl.searchParams.get("pageToken"),
    liveChatId: req.nextUrl.searchParams.get("liveChatId"),
  });
  if (!result.ok) {
    if (result.status === 404 || result.status === 410) return NextResponse.json(idle);
    return NextResponse.json({ error: errorText(result.error) }, { status: result.status });
  }
  return NextResponse.json({ ...result, channelId: auth.channel.id });
}
