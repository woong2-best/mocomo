import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assertManualPayoutReady } from "@/lib/creator-payout/readiness";
import { handleOnDemandWithdrawPost } from "@/lib/settlement-moco/on-demand-withdraw-route";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlement-request", 8);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const ready = await assertManualPayoutReady(session.user.id);
  if (!ready.ok) {
    return NextResponse.json({ error: ready.message, code: ready.code }, { status: ready.status });
  }

  return handleOnDemandWithdrawPost(session.user.id, req.headers.get("X-Idempotency-Key"));
}
