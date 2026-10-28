import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  buildFacebookAuthorizeUrl,
  isFacebookOAuthConfigured,
  mintFacebookOAuthState,
  safeFacebookReturnTo,
} from "@/lib/facebook-oauth";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-facebook-start", 20);
  if (limited) return limited;

  if (!isFacebookOAuthConfigured()) {
    if (req.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json(
        { error: "Facebook OAuth is not configured." },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }

  try {
    const returnTo = safeFacebookReturnTo(req.nextUrl.searchParams.get("returnTo"));
    const addAccount = req.nextUrl.searchParams.get("addAccount") === "1";
    const state = mintFacebookOAuthState({ returnTo, addAccount });
    const authorizeUrl = buildFacebookAuthorizeUrl(state);

    if (req.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json({ url: authorizeUrl });
    }
    return NextResponse.redirect(authorizeUrl);
  } catch {
    if (req.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json(
        { error: "Facebook OAuth is not configured." },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL("/auth/signin?reason=oauth_failed", req.url));
  }
}
