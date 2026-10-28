import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { auth } from "@/lib/auth";
import { safeOAuthReturnTo } from "@/lib/meta-oauth-shared";
import { isTikTokOAuthConfigured } from "@/lib/profile-social";
import { MOBILE_SOCIAL_RETURN_TO, ticketFromRequest } from "@/lib/profile-social-ticket";
import { buildTikTokAuthorizeUrl } from "@/lib/tiktok-oauth";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-tiktok-start", 20);
  if (limited) return limited;

  const ticket = ticketFromRequest(req, "tiktok");
  const session = ticket ? null : await auth();
  if (!ticket && !session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/settings/profile", req.url));
  }

  if (!isTikTokOAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }

  try {
    const returnTo = ticket
      ? MOBILE_SOCIAL_RETURN_TO
      : safeOAuthReturnTo(req.nextUrl.searchParams.get("returnTo")) ?? "/settings/profile";
    return NextResponse.redirect(
      buildTikTokAuthorizeUrl(returnTo, ticket?.userId, req.nextUrl.origin)
    );
  } catch {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }
}
