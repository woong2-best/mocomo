import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getRequestIp } from "@/lib/request-ip";
import { authenticateCredentialsUser } from "@/lib/mobile-credentials-login";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";
import { CredentialsSignin } from "next-auth";
import { loginErrorMessage } from "@/lib/auth-login-errors";

const bodySchema = z.object({
  login: z.string().min(1).max(320),
  password: z.string().min(1).max(200),
  deviceId: z.string().max(128).optional(),
  platform: z.enum(["android", "ios"]).optional(),
});

function loginFailResponse(err: unknown) {
  if (err instanceof CredentialsSignin) {
    const code = (err as CredentialsSignin & { code?: string }).code;
    const status =
      code === "rate_limited" ? 429 : code === "banned" ? 403 : code === "email_not_verified" ? 403 : 401;
    return NextResponse.json(
      { error: loginErrorMessage(code), code: code ?? "invalid_credentials" },
      { status }
    );
  }
  console.error("[api/mobile/auth/login]", err);
  return NextResponse.json({ error: "로그인에 실패했습니다." }, { status: 500 });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-login", 30);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "로그인 정보를 확인해 주세요." }, { status: 400 });
  }

  const ip = await getRequestIp();
  try {
    const user = await authenticateCredentialsUser(
      parsed.data.login,
      parsed.data.password,
      ip,
      { channel: "mobile", platform: parsed.data.platform }
    );
    const tokens = await issueMobileTokenPair({
      userId: user.id,
      deviceId: parsed.data.deviceId,
      platform: parsed.data.platform,
    });

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        locale: user.locale,
      },
    });
  } catch (err) {
    return loginFailResponse(err);
  }
}
