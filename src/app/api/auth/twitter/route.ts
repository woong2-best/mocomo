import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { auth } from "@/lib/auth";
import { isTwitterOAuthConfigured } from "@/lib/profile-social";
import { buildTwitterAuthorizeUrl } from "@/lib/twitter-oauth";
import { safeOAuthReturnTo } from "@/lib/meta-oauth-shared";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-twitter-start", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/settings/profile", req.url));
  }

  if (!isTwitterOAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }

  try {
    const returnTo = safeOAuthReturnTo(req.nextUrl.searchParams.get("returnTo")) ?? "/settings/profile";
    const authorizeUrl = await buildTwitterAuthorizeUrl(returnTo);
    return NextResponse.redirect(authorizeUrl);
  } catch {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }
}
