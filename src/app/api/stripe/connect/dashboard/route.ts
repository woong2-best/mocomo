import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { createWalletConnectDashboardLink, getWalletStripeConnectStatus } from "@/lib/wallet-stripe-connect";

/** Stripe Express Dashboard 로그인 링크 — 정산 계좌/내역 관리 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "stripe-connect-dashboard", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const status = await getWalletStripeConnectStatus(session.user.id);
  if (!status.stripeConnectAccountId) {
    return NextResponse.json({ error: "Stripe 정산 계좌를 먼저 연결해 주세요." }, { status: 400 });
  }

  const link = await createWalletConnectDashboardLink(status.stripeConnectAccountId);
  if ("error" in link) {
    return NextResponse.json({ error: link.error }, { status: 422 });
  }

  return NextResponse.json({ url: link.url });
}
