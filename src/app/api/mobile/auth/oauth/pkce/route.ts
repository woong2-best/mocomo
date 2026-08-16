import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { openMobileOAuthHandoff } from "@/lib/mobile-oauth-handoff";
import { recordUserAccessLog } from "@/lib/user-access-log";
import { getRequestIp } from "@/lib/request-ip";

const bodySchema = z.object({
  handoff: z.string().min(20).max(8000),
});

/**
 * Exchange one-time sealed handoff from AuthSession deep link → mobile tokens.
 * Replaces the Phase 1.1 PKCE stub for Discord/LINE/X (+ Gmail/Naver after web session).
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-oauth-exchange", 30);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "인증 코드가 올바르지 않습니다." }, { status: 400 });
  }

  const payload = openMobileOAuthHandoff(parsed.data.handoff);
  if (!payload) {
    return NextResponse.json(
      { error: "인증이 만료되었거나 올바르지 않습니다. 앱에서 다시 시도해 주세요.", code: "handoff_invalid" },
      { status: 401 }
    );
  }

  const ip = await getRequestIp();
  void recordUserAccessLog({
    userId: payload.user.id,
    username: payload.user.username,
    success: true,
    channel: "mobile",
    provider: "oauth",
    ip,
  });

  return NextResponse.json({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: payload.expiresAt,
    user: payload.user,
  });
}
