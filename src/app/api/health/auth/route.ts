import { NextResponse } from "next/server";
import { getAuthConfigStatus } from "@/lib/auth-env";

/** 프로덕션 OAuth 설정 점검 — 비밀값은 노출하지 않음 */
export async function GET() {
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
    discordOAuth: status.discordOAuth,
    twitterOAuth: status.twitterOAuth,
    googleOAuth: status.googleOAuth,
    discordCallback: status.authUrl
      ? `${status.authUrl}/api/auth/callback/discord`
      : null,
    twitterCallback: status.authUrl
      ? `${status.authUrl}/api/auth/callback/twitter`
      : null,
    vercelEnv: status.vercelEnv,
  });
}
