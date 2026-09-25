import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getRequestIp } from "@/lib/request-ip";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";
import {
  MobileNativeOAuthError,
  resolveMobileNativeOAuthAuth,
} from "@/lib/mobile-native-oauth-auth";
import { recordUserAccessLog } from "@/lib/user-access-log";

const bodySchema = z.object({
  accessToken: z.string().min(20).max(8000),
  flow: z.enum(["signin", "signup"]).default("signin"),
  deviceId: z.string().max(128).optional(),
  platform: z.enum(["android", "ios"]).optional(),
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  birthMonth: z.coerce.number().int().min(1).max(12).optional(),
  birthDay: z.coerce.number().int().min(1).max(31).optional(),
  termsAccepted: z.boolean().optional(),
  privacyAccepted: z.boolean().optional(),
});

/** Native LINE Login SDK → mobile bearer tokens. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-line", 30);
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
    const result = await resolveMobileNativeOAuthAuth({
      provider: "line",
      accessToken: parsed.data.accessToken,
      flow: parsed.data.flow,
      birthYear: parsed.data.birthYear,
      birthMonth: parsed.data.birthMonth,
      birthDay: parsed.data.birthDay,
      termsAccepted: parsed.data.termsAccepted,
      privacyAccepted: parsed.data.privacyAccepted,
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
      provider: "line",
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
    if (err instanceof MobileNativeOAuthError) {
      void recordUserAccessLog({
        success: false,
        failureReason: err.code,
        channel: "mobile",
        provider: "line",
        platform: parsed.data.platform ?? null,
        ip,
      });
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      );
    }
    console.error("[api/mobile/auth/line]", err);
    return NextResponse.json({ error: "로그인에 실패했습니다." }, { status: 500 });
  }
}
