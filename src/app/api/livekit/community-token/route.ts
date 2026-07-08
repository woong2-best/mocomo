import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";
import { db } from "@/lib/db";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";

export const runtime = "nodejs";
export const maxDuration = 15;

function authCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

/**
 * JWT만 읽어 토큰 발급 — auth() full session / DB 하이드레이트 경로를 우회.
 */
export async function GET(req: NextRequest) {
  try {
    const jwt = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
      cookieName: authCookieName(),
    });
    const userId = (jwt?.id as string | undefined) ?? (jwt?.sub as string | undefined);
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
    if (!allowed && voice.communityId) {
      const member = await db.communityMember.findUnique({
        where: {
          communityId_userId: { communityId: voice.communityId, userId },
        },
        select: { id: true },
      });
      allowed = !!member;
    } else if (!allowed) {
      // communityId 비어 있으면 채널 링크만 한 번 확인
      try {
        const linked = await db.communityChannel.findFirst({
          where: { voiceChannelId: channelId },
          select: { communityId: true },
        });
        if (linked) {
          const member = await db.communityMember.findUnique({
            where: {
              communityId_userId: { communityId: linked.communityId, userId },
            },
            select: { id: true },
          });
          allowed = !!member;
        }
      } catch {
        /* CommunityChannel 테이블 미준비면 생성자만 허용 */
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "커뮤니티 멤버만 참가할 수 있습니다." }, { status: 403 });
    }

    const communityId = voice.communityId;
    let canScreenShare = true;
    if (communityId) {
      const community = await db.community.findUnique({
        where: { id: communityId },
        select: { creatorId: true },
      });
      const isOwner = community?.creatorId === userId;
      const perms = await loadMemberPermissions(communityId, userId, isOwner);
      canScreenShare = hasPermission(perms, "shareScreen");
    }

    const displayName =
      (jwt?.username as string | undefined) ||
      (jwt?.name as string | undefined) ||
      userId;

    const token = await createLivekitToken(channelId, userId, displayName, {
      publish: true,
      audioOnly: false,
      screenShare: canScreenShare,
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
