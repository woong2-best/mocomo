import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { syncExternalPlatformLiveEnd } from "@/lib/live-external/sync-platform-end";
import { syncExternalChannelPlatformMeta } from "@/lib/live-external/sync-platform-meta";
import type { LiveExternalProvider } from "@/lib/live-external/types";

export const dynamic = "force-dynamic";

/** Poll external platform live status; optionally refresh title/description from YT/Twitch. */
export async function GET(
  req: NextRequest,
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

  const wantMeta = req.nextUrl.searchParams.get("meta") === "1";

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
      name: true,
      description: true,
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
      title: channel.name,
      description: channel.description,
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

  let title = channel.name;
  let description = channel.description;

  if (
    wantMeta &&
    stillLive &&
    channel.externalProvider &&
    channel.externalId
  ) {
    const meta = await syncExternalChannelPlatformMeta({
      channelId,
      provider: channel.externalProvider as LiveExternalProvider,
      externalId: channel.externalId,
      currentName: channel.name,
      currentDescription: channel.description,
    });
    if (meta.title?.trim()) title = meta.title.trim().slice(0, 120);
    if (meta.description?.trim()) description = meta.description.trim().slice(0, 500);
  }

  return NextResponse.json({
    ok: true,
    mocomoLive: stillLive,
    platformOnAir: sync.platformOnAir,
    ended: sync.ended || !stillLive,
    provider: channel.externalProvider as LiveExternalProvider | null,
    title,
    description,
  });
}
