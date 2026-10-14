import { NextRequest, NextResponse } from "next/server";
import { getClientIpFromRequest, rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId, invalidateMobileUserGateCache } from "@/lib/api-mobile-auth";
import { termsAgreeJson } from "@/lib/legal/terms-agreement-http";

/** POST — mobile: record agreement to the latest Terms of Service. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-legal-terms-agree", 20);
  if (limited) return limited;

  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const res = await termsAgreeJson(userId, getClientIpFromRequest(req));
  invalidateMobileUserGateCache(userId);
  return res;
}
