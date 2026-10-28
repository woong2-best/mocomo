import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { completeFacebookLogin } from "@/lib/facebook-login";
import {
  normalizeOAuthCode,
  verifyFacebookOAuthState,
} from "@/lib/facebook-oauth";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-facebook-callback", 30);
  if (limited) return limited;

  const oauthError = req.nextUrl.searchParams.get("error");
  const code = normalizeOAuthCode(req.nextUrl.searchParams.get("code"));
  const state = req.nextUrl.searchParams.get("state");

  if (oauthError) {
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }

  const verified = verifyFacebookOAuthState(state);
  if ("error" in verified) {
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }

  try {
    const result = await completeFacebookLogin({ code, state: verified });
    return NextResponse.redirect(new URL(result.redirectTo, req.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "oauth_failed";
    console.error("[auth][facebook] callback failed", message);
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }
}
