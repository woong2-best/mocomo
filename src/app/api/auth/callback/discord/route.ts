import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { completeDiscordProfileConnect } from "@/lib/profile-social-connect";
import { normalizeOAuthCode, verifyDiscordOAuthState } from "@/lib/discord-oauth";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-discord-callback", 30);
  if (limited) return limited;

  const oauthError = req.nextUrl.searchParams.get("error");
  const code = normalizeOAuthCode(req.nextUrl.searchParams.get("code"));
  const state = req.nextUrl.searchParams.get("state");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }

  const verified = verifyDiscordOAuthState(state);
  if ("error" in verified) {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }

  try {
    const result = await completeDiscordProfileConnect({ code, state: verified });
    return NextResponse.redirect(new URL(result.redirectTo, req.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "oauth_failed";
    console.error("[auth][discord] profile connect failed", message);
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }
}
