import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * 커뮤니티 음성/영상 통합 토큰.
 * 최소한의 DB 조회만 — cold start에서도 빠르게 응답.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCachedSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const channelId = req.nextUrl.searchParams.get("channelId");
    if (!channelId) {
      return NextResponse.json({ error: "channelId required" }, { status: 400 });
    }

    if (!isLivekitConfigured()) {
      return NextResponse.json({ error: "LiveKit 서버 설정이 없습니다." }, { status: 503 });
    }

    const voice = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: { id: true, communityId: true, createdBy: true },
    });
    if (!voice) {
      return NextResponse.json({ error: "음성 채널을 찾을 수 없습니다." }, { status: 404 });
    }

    let allowed = voice.createdBy === userId;
    if (!allowed) {
      let communityId = voice.communityId;
      if (!communityId) {
        try {
          const linked = await db.communityChannel.findFirst({
            where: { voiceChannelId: channelId },
            select: { communityId: true },
          });
          communityId = linked?.communityId ?? null;
        } catch {
          communityId = null;
        }
      }
      if (communityId) {
        const member = await db.communityMember.findUnique({
          where: { communityId_userId: { communityId, userId } },
          select: { id: true },
        });
        allowed = !!member;
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "커뮤니티 멤버만 참가할 수 있습니다." }, { status: 403 });
    }

    const displayName = session.user.username || session.user.name || userId;
    const token = await createLivekitToken(channelId, userId, displayName, {
      publish: true,
      audioOnly: false,
    });
    if (!token) {
      return NextResponse.json({ error: "LiveKit 토큰 생성 실패" }, { status: 503 });
    }

    const serverUrl = getLivekitUrl();
    if (!serverUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_LIVEKIT_URL이 필요합니다." }, { status: 503 });
    }

    return NextResponse.json({
      token,
      serverUrl,
      role: voice.createdBy === userId ? "host" : "member",
    });
  } catch (e) {
    console.error("[api/livekit/community-token]", e);
    return NextResponse.json({ error: "음성 서버 연결 오류" }, { status: 500 });
  }
}
