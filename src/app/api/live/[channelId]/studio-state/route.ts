import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  readPublisherTabIdFromRequest,
  resolveHostPublishState,
} from "@/lib/live-publisher-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 호스트 스튜디오 — 이 탭에서 송출 가능 여부 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const tabId = readPublisherTabIdFromRequest(req);

  let channel: {
    createdBy: string;
    isLive: boolean;
    liveStatus: string;
    livePublisherTabId?: string | null;
    broadcastMode: string;
  } | null = null;

  try {
    channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        createdBy: true,
        isLive: true,
        liveStatus: true,
        livePublisherTabId: true,
        broadcastMode: true,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/livePublisherTabId|column/i.test(msg)) throw e;
    const row = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        createdBy: true,
        isLive: true,
        liveStatus: true,
        broadcastMode: true,
      },
    });
    channel = row ? { ...row, livePublisherTabId: null } : null;
  }

  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }
  if (channel.createdBy !== session.user.id) {
    return NextResponse.json({ error: "호스트만 확인할 수 있습니다." }, { status: 403 });
  }

  const publishState = resolveHostPublishState(channel, tabId);

  return NextResponse.json({
    ok: true,
    publishState,
    isLive: channel.isLive,
    liveStatus: channel.liveStatus,
    broadcastMode: channel.broadcastMode,
    canPublishOnThisTab: publishState === "idle" || publishState === "live_here",
  });
}
