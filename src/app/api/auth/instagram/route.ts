import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  buildInstagramAuthorizeUrl,
  isInstagramOAuthConfigured,
  mintInstagramOAuthState,
  safeInstagramReturnTo,
} from "@/lib/instagram-oauth";
import { MOBILE_SOCIAL_RETURN_TO, ticketFromRequest } from "@/lib/profile-social-ticket";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-instagram-start", 20);
  if (limited) return limited;

  if (!isInstagramOAuthConfigured()) {
    if (req.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json(
        { error: "Instagram OAuth is not configured." },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }

  try {
    const ticket = ticketFromRequest(req, "instagram");
    const returnTo =
      ticket != null
        ? MOBILE_SOCIAL_RETURN_TO
        : safeInstagramReturnTo(req.nextUrl.searchParams.get("returnTo"));
    const addAccount = req.nextUrl.searchParams.get("addAccount") === "1";
    const state = mintInstagramOAuthState({
      returnTo,
      addAccount,
      linkUserId: ticket?.userId,
    });
    const authorizeUrl = buildInstagramAuthorizeUrl(state);

    if (req.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json({ url: authorizeUrl });
    }
    return NextResponse.redirect(authorizeUrl);
  } catch {
    if (req.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json(
        { error: "Instagram OAuth is not configured." },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }
}
