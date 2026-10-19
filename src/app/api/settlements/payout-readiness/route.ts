import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getPayoutReadiness } from "@/lib/creator-payout/readiness";

async function userIdOrResponse() {
  try {
    const user = await requireAuth();
    return { userId: user.id };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "UNAUTHORIZED") {
      return { error: NextResponse.json({ error: "Sign-in required." }, { status: 401 }) };
    }
    return { error: NextResponse.json({ error: "This account cannot view payout details." }, { status: 403 }) };
  }
}

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "payout-readiness", 30);
  if (limited) return limited;
  const auth = await userIdOrResponse();
  if ("error" in auth) return auth.error;
  const readiness = await getPayoutReadiness(auth.userId);
  return NextResponse.json(readiness);
}
