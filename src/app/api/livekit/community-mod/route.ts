import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { TrackSource } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { createLivekitRoomClient } from "@/lib/livekit-community-client";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";

export const runtime = "nodejs";
export const maxDuration = 15;

function authCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

type ModAction = "mute" | "disconnect";

export async function POST(req: NextRequest) {
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

    const body = (await req.json().catch(() => ({}))) as {
      channelId?: string;
      communityId?: string;
      targetIdentity?: string;
      action?: ModAction;
    };

    const { channelId, communityId, targetIdentity, action } = body;
    if (!channelId || !communityId || !targetIdentity || !action) {
      return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
    }
    if (targetIdentity === userId) {
      return NextResponse.json({ error: "자기 자신은 대상이 될 수 없습니다." }, { status: 400 });
    }

    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true },
    });
    if (!community) {
      return NextResponse.json({ error: "커뮤니티를 찾을 수 없습니다." }, { status: 404 });
    }

    const isOwner = community.creatorId === userId;
    const perms = await loadMemberPermissions(communityId, userId, isOwner);

    if (action === "mute" && !hasPermission(perms, "muteMembers")) {
      return NextResponse.json({ error: "음소거 권한이 없습니다." }, { status: 403 });
    }
    if (action === "disconnect" && !hasPermission(perms, "forceMoveVoice")) {
      return NextResponse.json({ error: "강제 퇴장 권한이 없습니다." }, { status: 403 });
    }

    const voice = await db.voiceChannel.findFirst({
      where: { id: channelId, communityId },
      select: { id: true },
    });
    if (!voice) {
      return NextResponse.json({ error: "음성 채널을 찾을 수 없습니다." }, { status: 404 });
    }

    const client = createLivekitRoomClient();
    if (!client) {
      return NextResponse.json({ error: "LiveKit 서버 설정이 없습니다." }, { status: 503 });
    }

    if (action === "disconnect") {
      await client.removeParticipant(channelId, targetIdentity);
      return NextResponse.json({ success: true });
    }

    const participant = await client.getParticipant(channelId, targetIdentity);
    const audioTracks =
      participant.tracks?.filter(
        (t) => t.source === TrackSource.MICROPHONE || t.type === 0 /* AUDIO */
      ) ?? [];

    if (audioTracks.length === 0) {
      return NextResponse.json({ error: "음성 트랙이 없습니다." }, { status: 404 });
    }

    for (const track of audioTracks) {
      if (track.sid) {
        await client.mutePublishedTrack(channelId, targetIdentity, track.sid, true);
      }
    }

    return NextResponse.json({ success: true, muted: audioTracks.length });
  } catch (e) {
    console.error("[api/livekit/community-mod]", e);
    return NextResponse.json({ error: "음성 모더레이션 오류" }, { status: 500 });
  }
}
