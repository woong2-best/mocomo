import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess, countActiveLiveViewers } from "@/lib/live-room-access";

/** 라이브 시청 하트비트 — server action 대신 가벼운 JSON API */
export async function POST(
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

  await db.voiceMember.upsert({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    create: {
      channelId,
      userId: session.user.id,
      role: access.isHost ? "HOST" : "VIEWER",
      lastSeenAt: new Date(),
    },
    update: { lastSeenAt: new Date() },
  });

  const viewerCount = await countActiveLiveViewers(channelId);
  return NextResponse.json({ ok: true, viewerCount });
}
