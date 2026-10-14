import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIpFromRequest, rateLimitPublicApi } from "@/lib/api-security";
import { termsAgreeJson } from "@/lib/legal/terms-agreement-http";

/** POST — record agreement to the latest Terms of Service. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "legal-terms-agree", 20);
  if (limited) return limited;

  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  return termsAgreeJson(session.user.id, getClientIpFromRequest(req));
}
