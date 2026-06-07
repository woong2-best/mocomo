import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import type { LiveCollabCoHost } from "@/hooks/use-live-collab-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 분할 합방 상태 — 호스트·시청자·CO_HOST */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "입장 권한이 없습니다." }, { status: 403 });
  }

  let channel: {
    liveCollabSplitEnabled: boolean;
    liveCollabUserId: string | null;
    createdBy: string;
  } | null = null;

  try {
    channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        liveCollabSplitEnabled: true,
        liveCollabUserId: true,
        createdBy: true,
      },
    });
  } catch {
    channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: { createdBy: true },
    }) as typeof channel;
    if (channel) {
      channel = {
        ...channel,
        liveCollabSplitEnabled: false,
        liveCollabUserId: null,
      };
    }
  }

  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }

  const splitActive =
    !!channel.liveCollabSplitEnabled &&
    !!channel.liveCollabUserId &&
    channel.liveCollabUserId !== channel.createdBy;

  let coHost: LiveCollabCoHost | null = null;
  if (splitActive && channel.liveCollabUserId) {
    const row = await db.user.findUnique({
      where: { id: channel.liveCollabUserId },
      select: { id: true, username: true, name: true, image: true },
    });
    coHost = row;
  }

  return NextResponse.json({
    splitEnabled: channel.liveCollabSplitEnabled,
    splitActive,
    coHostUserId: channel.liveCollabUserId,
    coHost,
    hostUserId: channel.createdBy,
  });
}
