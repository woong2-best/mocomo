import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getWalletStripeConnectStatus } from "@/lib/wallet-stripe-connect";

/** Stripe Connect 온보딩 상태 조회 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "stripe-connect-status", 40);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const status = await getWalletStripeConnectStatus(session.user.id);
  return NextResponse.json({
    stripeOnboardingCompleted: status.stripeOnboardingCompleted,
    stripeConnectAccountId: status.stripeConnectAccountId,
  });
}
