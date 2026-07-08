import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * 커뮤니티 음성/영상 — 멤버십만 확인하고 즉시 LiveKit 토큰 발급.
 * (방송용 isLive 검사 / rate-limit 대기 없음)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const channelId = req.nextUrl.searchParams.get("channelId");
    const kind = (req.nextUrl.searchParams.get("kind") ?? "VOICE") as "VOICE" | "VIDEO";
    if (!channelId) {
      return NextResponse.json({ error: "channelId required" }, { status: 400 });
    }

    if (!isLivekitConfigured()) {
      return NextResponse.json(
        { error: "LiveKit 서버 설정이 없습니다. LIVEKIT_* 환경 변수를 확인하세요." },
        { status: 503 }
      );
    }

    // VoiceChannel + 커뮤니티 채널을 한 번에 (가능하면 communityId로 멤버십 확인)
    const voice = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        communityId: true,
        createdBy: true,
        communityChannel: {
          select: {
            type: true,
            communityId: true,
            community: { select: { creatorId: true } },
          },
        },
      },
    });

    if (!voice) {
      return NextResponse.json({ error: "음성 채널을 찾을 수 없습니다." }, { status: 404 });
    }

    const communityId =
      voice.communityChannel?.communityId ?? voice.communityId ?? null;
    const creatorId = voice.communityChannel?.community.creatorId ?? voice.createdBy;

    if (!communityId) {
      // 커뮤니티에 묶이지 않은 레거시 음성방 — 생성자만
      if (voice.createdBy !== session.user.id) {
        return NextResponse.json({ error: "참가 권한이 없습니다." }, { status: 403 });
      }
    } else {
      const [member, isCreator] = await Promise.all([
        db.communityMember.findUnique({
          where: {
            communityId_userId: { communityId, userId: session.user.id },
          },
          select: { id: true },
        }),
        Promise.resolve(creatorId === session.user.id),
      ]);
      if (!member && !isCreator) {
        return NextResponse.json({ error: "커뮤니티 멤버만 참가할 수 있습니다." }, { status: 403 });
      }
    }

    const displayName = session.user.username || session.user.name || session.user.id;
    const token = await createLivekitToken(channelId, session.user.id, displayName, {
      publish: true,
      audioOnly: kind !== "VIDEO",
    });
    if (!token) {
      return NextResponse.json({ error: "LiveKit 토큰 생성 실패" }, { status: 503 });
    }

    const serverUrl = getLivekitUrl();
    if (!serverUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_LIVEKIT_URL이 필요합니다." }, { status: 503 });
    }

    // 멤버십 기록은 토큰 응답 후 비동기
    void db.voiceMember
      .upsert({
        where: { channelId_userId: { channelId, userId: session.user.id } },
        create: {
          channelId,
          userId: session.user.id,
          role: creatorId === session.user.id ? "HOST" : "VIEWER",
        },
        update: { lastSeenAt: new Date() },
      })
      .catch(() => undefined);

    return NextResponse.json({
      token,
      serverUrl,
      role: creatorId === session.user.id ? "host" : "member",
      audioOnly: kind !== "VIDEO",
    });
  } catch (e) {
    console.error("[api/livekit/community-token]", e);
    const msg = e instanceof Error ? e.message : "unknown";
    // 테이블 미생성 등 명확히 노출
    if (msg.includes("CommunityChannel") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "커뮤니티 채널 DB가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "음성 서버 연결 오류" }, { status: 500 });
  }
}
