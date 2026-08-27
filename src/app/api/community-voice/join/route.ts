import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveCommunityVoiceAccess } from "@/lib/community-voice/access";

export const runtime = "nodejs";

function authCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

/** GET /api/community-voice/join?channelId= — membership gate for community voice (WebRTC mesh). */
export async function GET(req: NextRequest) {
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

  const result = await resolveCommunityVoiceAccess(channelId, userId, displayName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ channelId, displayName: result.displayName });
}
