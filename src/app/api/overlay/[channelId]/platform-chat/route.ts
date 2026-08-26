import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";
import { assertOverlayBroadcastAccess } from "@/lib/live-external/overlay-access";
import { handlePlatformChatRequest } from "@/lib/live-external/platform-chat/handler";

export const dynamic = "force-dynamic";

/** Token-auth platform chat for OBS overlay (YouTube poll + Chzzk session). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-platform-chat", 120);
  if (limited) return limited;

  const { channelId } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const verified = verifyOverlayToken(token, { channelId, kind: "chat" });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const access = await assertOverlayBroadcastAccess(channelId, verified.payload);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const channel = access.channel;
  if (!channel.externalProvider || !channel.externalId) {
    return NextResponse.json({ error: "외부 방송이 아닙니다." }, { status: 400 });
  }

  const result = await handlePlatformChatRequest(
    {
      externalProvider: channel.externalProvider,
      externalId: channel.externalId,
      externalChannelId: channel.externalChannelId,
      connectedStreamingAccountId: channel.connectedStreamingAccountId,
    },
    {
      pageToken: req.nextUrl.searchParams.get("pageToken"),
      liveChatId: req.nextUrl.searchParams.get("liveChatId"),
      kind: req.nextUrl.searchParams.get("kind"),
    }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { ok: _ok, session, ...body } = result;
  return NextResponse.json({
    ok: true,
    live: true,
    ...body,
    session: session
      ? {
          chatChannelId: session.chatChannelId,
          accessToken: session.accessToken,
          wsServerId: session.wsServerId,
        }
      : null,
  });
}
