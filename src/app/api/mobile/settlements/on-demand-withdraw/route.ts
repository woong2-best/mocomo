import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { handleOnDemandWithdrawPost } from "@/lib/settlement-moco/on-demand-withdraw-route";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-on-demand-withdraw", 8);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  return handleOnDemandWithdrawPost(authResult.user.id, req.headers.get("X-Idempotency-Key"));
}
