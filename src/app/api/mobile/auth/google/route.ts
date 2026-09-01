import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getRequestIp } from "@/lib/request-ip";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";
import {
  MobileGoogleAuthError,
  resolveMobileGoogleAuth,
} from "@/lib/mobile-google-auth";
import { recordUserAccessLog } from "@/lib/user-access-log";

const bodySchema = z.object({
  idToken: z.string().min(20).max(8000),
  flow: z.enum(["signin", "signup"]).default("signin"),
  deviceId: z.string().max(128).optional(),
  platform: z.enum(["android", "ios"]).optional(),
});

/** Native Google Sign-In → mobile bearer tokens (no browser handoff). */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-google", 30);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "인증 정보를 확인해 주세요." }, { status: 400 });
  }

  const ip = await getRequestIp();

  try {
    const result = await resolveMobileGoogleAuth({
      idToken: parsed.data.idToken,
      flow: parsed.data.flow,
    });

    if (result.status === "needsSignup") {
      return NextResponse.json({
        status: "needsSignup",
        profile: result.profile,
      });
    }

    const tokens = await issueMobileTokenPair({
      userId: result.userId,
      deviceId: parsed.data.deviceId,
      platform: parsed.data.platform,
    });

    void recordUserAccessLog({
      userId: result.userId,
      username: result.user.username,
      success: true,
      channel: "mobile",
      provider: "google",
      platform: parsed.data.platform ?? null,
      ip,
    });

    return NextResponse.json({
      status: "signedIn",
      created: result.created,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      user: result.user,
    });
  } catch (err) {
    if (err instanceof MobileGoogleAuthError) {
      void recordUserAccessLog({
        success: false,
        failureReason: err.code,
        channel: "mobile",
        provider: "google",
        platform: parsed.data.platform ?? null,
        ip,
      });
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      );
    }
    console.error("[api/mobile/auth/google]", err);
    return NextResponse.json({ error: "로그인에 실패했습니다." }, { status: 500 });
  }
}
