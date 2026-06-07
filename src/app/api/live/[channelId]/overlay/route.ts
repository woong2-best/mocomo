import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emptyOverlayState, normalizeOverlayState } from "@/lib/live-overlays/defaults";
import type { LiveOverlayState } from "@/lib/live-overlays/types";

function parseState(raw: unknown): LiveOverlayState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as LiveOverlayState;
  if (!Array.isArray(o.widgets)) return null;
  return normalizeOverlayState(o);
}

/** 시청자·호스트 — 저장된 오버레이 상태 조회 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { liveOverlayJson: true, isLive: true, liveStatus: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!channel.isLive || channel.liveStatus === "ENDED") {
    return NextResponse.json({ state: emptyOverlayState() });
  }

  const state = parseState(channel.liveOverlayJson) ?? emptyOverlayState();
  return NextResponse.json({ state });
}

/** 호스트 — 오버레이 상태 저장 (시청자 API·폴링용) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (channel.createdBy !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { state?: unknown } | null;
  const state = parseState(body?.state);
  if (!state) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  await db.voiceChannel.update({
    where: { id: channelId },
    data: { liveOverlayJson: state },
  });

  return NextResponse.json({ ok: true, state });
}
