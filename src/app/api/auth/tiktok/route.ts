import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { isTikTokOAuthConfigured } from "@/lib/profile-social";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-tiktok-start", 20);
  if (limited) return limited;

  if (!isTikTokOAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
  }

  return NextResponse.redirect(new URL("/settings/profile?reason=oauth_failed", req.url));
}
