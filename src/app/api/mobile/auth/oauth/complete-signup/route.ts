import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getRequestIp } from "@/lib/request-ip";
import {
  completeMobileOAuthSignup,
  MobileOAuthSignupError,
} from "@/lib/mobile-oauth-complete-signup";
import { recordUserAccessLog } from "@/lib/user-access-log";

const bodySchema = z.object({
  handoff: z.string().min(20).max(8000),
  deviceId: z.string().max(128).optional(),
  platform: z.enum(["android", "ios"]).optional(),
});

/** In-app terms accepted → create account from sealed Discord/X/Naver/LINE handoff. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-oauth-signup", 20);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "가입 정보를 확인해 주세요." }, { status: 400 });
  }

  const ip = await getRequestIp();

  try {
    const result = await completeMobileOAuthSignup({
      handoff: parsed.data.handoff,
      platform: parsed.data.platform,
      deviceId: parsed.data.deviceId,
    });

    void recordUserAccessLog({
      userId: result.user.id,
      username: result.user.username,
      success: true,
      channel: "mobile",
      provider: "oauth_signup",
      platform: parsed.data.platform ?? null,
      ip,
    });

    return NextResponse.json({
      status: "signedIn",
      created: result.created,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt.toISOString(),
      user: result.user,
    });
  } catch (err) {
    if (err instanceof MobileOAuthSignupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      );
    }
    console.error("[api/mobile/auth/oauth/complete-signup]", err);
    return NextResponse.json({ error: "가입에 실패했습니다." }, { status: 500 });
  }
}
