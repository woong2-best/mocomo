import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * 커뮤니티 Discord형 음성/영상 채널 전용 토큰.
 * 방송용 resolveLiveChannelAccess(NOT_LIVE)를 우회하고 멤버십만 검사.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const limited = await rateLimitPublicApi(req, `livekit-community:${session.user.id}`, 40);
    if (limited) return limited;

    const channelId = req.nextUrl.searchParams.get("channelId");
    const kind = (req.nextUrl.searchParams.get("kind") ?? "VOICE") as "VOICE" | "VIDEO";
    if (!channelId) {
      return NextResponse.json({ error: "channelId required" }, { status: 400 });
    }

    if (!isLivekitConfigured()) {
      return NextResponse.json(
        { error: "LiveKit 서버 설정이 없습니다." },
        { status: 503 }
      );
    }

    const communityChannel = await db.communityChannel.findFirst({
      where: {
        voiceChannelId: channelId,
        type: { in: kind === "VIDEO" ? ["VIDEO"] : ["VOICE", "VIDEO"] },
      },
      select: {
        id: true,
        communityId: true,
        type: true,
        voiceChannelId: true,
        community: { select: { creatorId: true } },
      },
    });

    if (!communityChannel?.voiceChannelId) {
      return NextResponse.json({ error: "채널을 찾을 수 없습니다." }, { status: 404 });
    }

    const member = await db.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: communityChannel.communityId,
          userId: session.user.id,
        },
      },
      select: { id: true, role: true },
    });

    const isOwner =
      communityChannel.community.creatorId === session.user.id || member?.role === "owner";

    if (!member && !isOwner) {
      return NextResponse.json({ error: "커뮤니티 멤버만 참가할 수 있습니다." }, { status: 403 });
    }

    // best-effort voiceMember upsert (비차단 — 토큰은 먼저 반환해도 됨)
    void db.voiceMember
      .upsert({
        where: { channelId_userId: { channelId, userId: session.user.id } },
        create: {
          channelId,
          userId: session.user.id,
          role: isOwner ? "HOST" : "VIEWER",
        },
        update: { lastSeenAt: new Date() },
      })
      .catch(() => undefined);

    const displayName = session.user.username || session.user.name || session.user.id;
    const audioOnly = kind !== "VIDEO";
    const token = await createLivekitToken(channelId, session.user.id, displayName, {
      publish: true,
      audioOnly,
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
      role: isOwner ? "host" : "member",
      audioOnly,
    });
  } catch (e) {
    console.error("[api/livekit/community-token]", e);
    return NextResponse.json({ error: "음성 서버 연결 오류" }, { status: 500 });
  }
}
