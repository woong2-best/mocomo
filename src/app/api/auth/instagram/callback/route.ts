import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { completeInstagramLogin } from "@/lib/instagram-login";
import {
  normalizeOAuthCode,
  verifyInstagramOAuthState,
} from "@/lib/instagram-oauth";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-instagram-callback", 30);
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

  const verified = verifyInstagramOAuthState(state);
  if ("error" in verified) {
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }

  try {
    const result = await completeInstagramLogin({ code, state: verified });
    return NextResponse.redirect(new URL(result.redirectTo, req.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "oauth_failed";
    console.error("[auth][instagram] callback failed", message);
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }
}
