import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { canViewerEnterLiveRoom } from "@/lib/live-channel-active";
import { handlePlatformChatRequest } from "@/lib/live-external/platform-chat/handler";

export const dynamic = "force-dynamic";

/** Poll external platform live chat (YouTube). Twitch uses client IRC. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "live-platform-chat", 120);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      externalProvider: true,
      externalId: true,
      externalChannelId: true,
      connectedStreamingAccountId: true,
      broadcastMode: true,
      mediaSourceType: true,
      isLive: true,
      liveStatus: true,
    },
  });

  if (!channel?.externalProvider || !channel.externalId) {
    return NextResponse.json({ error: "외부 방송이 아닙니다." }, { status: 400 });
  }

  if (
    channel.liveStatus === "ENDED" ||
    !canViewerEnterLiveRoom({ isLive: channel.isLive, liveStatus: channel.liveStatus })
  ) {
    return NextResponse.json({ error: "방송이 종료되었습니다." }, { status: 410 });
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
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { ok: _ok, ...body } = result;
  return NextResponse.json({ ok: true, ...body });
}
