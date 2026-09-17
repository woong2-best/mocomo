import { NextRequest, NextResponse } from "next/server";
import { getAuthConfigStatus } from "@/lib/auth-env";
import { guardSensitiveHealthEndpoint } from "@/lib/api-security";

/** 프로덕션 OAuth 설정 점검 — 비밀값은 노출하지 않음 */
export async function GET(req: NextRequest) {
  const denied = guardSensitiveHealthEndpoint(req);
  if (denied) return denied;

  const status = getAuthConfigStatus();

  return NextResponse.json({
    ok:
      status.secretConfigured &&
      status.secretLengthOk &&
      status.databaseUrlConfigured &&
      !!status.authUrl,
    authUrl: status.authUrl,
    secretConfigured: status.secretConfigured,
    secretLengthOk: status.secretLengthOk,
    databaseUrlConfigured: status.databaseUrlConfigured,
    trustHost: status.trustHost,
    discordOAuth: false,
    twitterOAuth: false,
    lineOAuth: false,
    naverOAuth: false,
    googleOAuth: status.googleOAuth,
    googleIdPresent: status.googleIdPresent,
    googleSecretPresent: status.googleSecretPresent,
    googleCallback: status.authUrl
      ? `${status.authUrl}/api/auth/callback/google`
      : null,
    vercelEnv: status.vercelEnv,
  });
}
