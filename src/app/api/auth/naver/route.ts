import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { auth } from "@/lib/auth";
import { safeOAuthReturnTo } from "@/lib/meta-oauth-shared";
import { buildNaverAuthorizeUrl } from "@/lib/naver-oauth";
import { isNaverOAuthConfigured } from "@/lib/profile-social";
import { MOBILE_SOCIAL_RETURN_TO, ticketFromRequest } from "@/lib/profile-social-ticket";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-naver-start", 20);
  if (limited) return limited;

  const ticket = ticketFromRequest(req, "naver");
  const session = ticket ? null : await auth();
  if (!ticket && !session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/settings/profile", req.url));
  }

  if (!isNaverOAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }

  try {
    const returnTo = ticket
      ? MOBILE_SOCIAL_RETURN_TO
      : safeOAuthReturnTo(req.nextUrl.searchParams.get("returnTo")) ?? "/settings/profile";
    const authorizeUrl = buildNaverAuthorizeUrl(returnTo, ticket?.userId);
    return NextResponse.redirect(authorizeUrl);
  } catch {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }
}
