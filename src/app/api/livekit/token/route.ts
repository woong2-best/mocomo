import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateLivekitCallRoom } from "@/lib/call-room-access";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";

export const runtime = "nodejs";

const CALL_DENY: Record<string, string> = {
  CALL_NOT_FOUND: "통화를 찾을 수 없습니다. 다시 전화해 주세요.",
  NOT_PARTICIPANT: "이 통화에 참여할 수 없습니다.",
  CALL_NOT_ACTIVE: "통화가 종료되었거나 아직 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.",
  DB_ERROR:
    "통화 DB(VoiceCall)가 아직 준비되지 않았습니다. Supabase SQL Editor에서 scripts/supabase-fix-all.sql H)를 실행해 주세요.",
};

const LIVE_DENY: Record<string, string> = {
  NOT_FOUND: "방송을 찾을 수 없습니다.",
  NOT_LIVE: "방송이 종료되었습니다.",
  NOT_MEMBER: "합방 비밀번호로 입장한 뒤 시청할 수 있습니다.",
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const room = req.nextUrl.searchParams.get("room");
    if (!room) {
      return NextResponse.json({ error: "room required" }, { status: 400 });
    }

    if (!isLivekitConfigured()) {
      return NextResponse.json(
        { error: "LiveKit 서버 설정이 없습니다. Vercel 환경 변수(LIVEKIT_*)를 확인하세요." },
        { status: 503 }
      );
    }

    const displayName =
      session.user.username || session.user.name || session.user.id;

    if (room.startsWith("call-")) {
      const access = await validateLivekitCallRoom(room, session.user.id);
      if (!access.allowed) {
        return NextResponse.json(
          {
            error: CALL_DENY[access.reason] ?? "통화 연결 권한이 없습니다.",
            reason: access.reason,
          },
          { status: access.reason === "DB_ERROR" ? 503 : 403 }
        );
      }

      const token = await createLivekitToken(room, session.user.id, displayName, {
        audioOnly: access.audioOnly,
        publish: true,
      });
      if (!token) {
        return NextResponse.json({ error: "LiveKit 토큰 생성 실패" }, { status: 503 });
      }

      return NextResponse.json({
        token,
        serverUrl: getLivekitUrl(),
        role: "call",
      });
    }

    const live = await resolveLiveChannelAccess(room, session.user.id);
    if (!live.allowed) {
      return NextResponse.json(
        { error: LIVE_DENY[live.reason] ?? "입장 권한이 없습니다.", reason: live.reason },
        { status: 403 }
      );
    }

    const token = await createLivekitToken(room, session.user.id, displayName, {
      publish: live.isHost,
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
      role: live.isHost ? "host" : "viewer",
      hostUserId: live.hostUserId,
    });
  } catch (e) {
    console.error("[api/livekit/token]", e);
    return NextResponse.json(
      { error: "음성/영상 서버 연결 중 오류가 발생했습니다.", reason: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
