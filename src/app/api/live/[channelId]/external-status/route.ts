import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { syncExternalPlatformLiveEnd } from "@/lib/live-external/sync-platform-end";
import type { LiveExternalProvider } from "@/lib/live-external/types";

export const dynamic = "force-dynamic";

/** Poll external platform (YouTube/Twitch/Chzzk) live status; auto-end MoCoMo when platform stops. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
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
      createdBy: true,
      isLive: true,
      liveStatus: true,
      broadcastMode: true,
      mediaSourceType: true,
      externalProvider: true,
      externalId: true,
      externalChannelId: true,
      connectedStreamingAccountId: true,
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }

  const isExternal =
    channel.broadcastMode === "EXTERNAL" || channel.mediaSourceType === "EXTERNAL";
  if (!isExternal) {
    return NextResponse.json({ error: "외부 방송이 아닙니다." }, { status: 400 });
  }

  const mocomoLive = channel.isLive && channel.liveStatus !== "ENDED";
  if (!mocomoLive) {
    return NextResponse.json({
      ok: true,
      mocomoLive: false,
      platformOnAir: false,
      ended: true,
      provider: channel.externalProvider,
    });
  }

  const sync = await syncExternalPlatformLiveEnd({
    id: channelId,
    createdBy: channel.createdBy,
    isLive: channel.isLive,
    liveStatus: channel.liveStatus ?? "LIVE",
    externalProvider: channel.externalProvider,
    externalId: channel.externalId,
    externalChannelId: channel.externalChannelId,
    connectedStreamingAccountId: channel.connectedStreamingAccountId,
  });

  const stillLive = channel.isLive && channel.liveStatus !== "ENDED" && !sync.ended;

  return NextResponse.json({
    ok: true,
    mocomoLive: stillLive,
    platformOnAir: sync.platformOnAir,
    ended: sync.ended || !stillLive,
    provider: channel.externalProvider as LiveExternalProvider | null,
  });
}
