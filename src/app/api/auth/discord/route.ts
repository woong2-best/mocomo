import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { auth } from "@/lib/auth";
import { buildDiscordAuthorizeUrl } from "@/lib/discord-oauth";
import { safeOAuthReturnTo } from "@/lib/meta-oauth-shared";
import { isDiscordOAuthConfigured } from "@/lib/profile-social";
import { MOBILE_SOCIAL_RETURN_TO, ticketFromRequest } from "@/lib/profile-social-ticket";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-discord-start", 20);
  if (limited) return limited;

  const ticket = ticketFromRequest(req, "discord");
  const session = ticket ? null : await auth();
  if (!ticket && !session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/settings/profile", req.url));
  }

  if (!isDiscordOAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }

  try {
    const returnTo = ticket
      ? MOBILE_SOCIAL_RETURN_TO
      : safeOAuthReturnTo(req.nextUrl.searchParams.get("returnTo")) ?? "/settings/profile";
    return NextResponse.redirect(buildDiscordAuthorizeUrl(returnTo, ticket?.userId));
  } catch {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }
}
