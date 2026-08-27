import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveJitsiCommunityRoom } from "@/lib/jitsi-community-room";

export const runtime = "nodejs";
export const maxDuration = 15;

function authCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

/** GET /api/jitsi/community-room?channelId= — community voice/video room access */
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

    const displayName =
      (jwt?.username as string | undefined) ||
      (jwt?.name as string | undefined) ||
      userId;

    const result = await resolveJitsiCommunityRoom(channelId, userId, displayName);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      domain: result.domain,
      roomName: result.roomName,
      displayName: result.displayName,
      config: result.config,
      ...(result.jwt ? { jwt: result.jwt } : {}),
    });
  } catch (e) {
    console.error("[api/jitsi/community-room]", e);
    return NextResponse.json({ error: "Jitsi 방 정보 조회 실패" }, { status: 500 });
  }
}
