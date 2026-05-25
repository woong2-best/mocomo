import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateLivekitCallRoom } from "@/lib/call-room-access";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";

export const runtime = "nodejs";

const DENY_MESSAGES: Record<string, string> = {
  CALL_NOT_FOUND: "통화를 찾을 수 없습니다. 다시 전화해 주세요.",
  NOT_PARTICIPANT: "이 통화에 참여할 수 없습니다.",
  CALL_NOT_ACTIVE: "통화가 종료되었거나 아직 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.",
  DB_ERROR:
    "통화 DB(VoiceCall)가 아직 준비되지 않았습니다. Supabase SQL Editor에서 scripts/supabase-fix-all.sql H)를 실행해 주세요.",
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다. 다시 로그인해 주세요." }, { status: 401 });
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

    const access = await validateLivekitCallRoom(room, session.user.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: DENY_MESSAGES[access.reason] ?? "통화 연결 권한이 없습니다.", reason: access.reason },
        { status: access.reason === "DB_ERROR" ? 503 : 403 }
      );
    }

    const token = await createLivekitToken(
      room,
      session.user.id,
      session.user.username || session.user.name || session.user.id,
      { audioOnly: access.audioOnly }
    );

    if (!token) {
      return NextResponse.json(
        { error: "LiveKit 토큰을 만들 수 없습니다. API 키/시크릿 형식을 확인하세요." },
        { status: 503 }
      );
    }

    const serverUrl = getLivekitUrl();
    if (!serverUrl) {
      return NextResponse.json(
        { error: "LiveKit URL이 없습니다. NEXT_PUBLIC_LIVEKIT_URL을 설정하세요." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      token,
      serverUrl,
      audioOnly: !!access.audioOnly,
    });
  } catch (e) {
    console.error("[api/livekit/token]", e);
    return NextResponse.json(
      {
        error:
          "음성 서버 연결 중 서버 오류가 발생했습니다. 잠시 후 다시 시도하거나, Vercel 로그에서 livekit/token을 확인해 주세요.",
        reason: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
