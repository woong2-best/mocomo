import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { createWalletConnectDashboardLink, getWalletStripeConnectStatus } from "@/lib/wallet-stripe-connect";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-stripe-connect-dashboard", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const status = await getWalletStripeConnectStatus(auth.user.id);
  if (!status.stripeConnectAccountId) {
    return NextResponse.json({ error: "Stripe 정산 계좌를 먼저 연결해 주세요." }, { status: 400 });
  }

  const link = await createWalletConnectDashboardLink(status.stripeConnectAccountId);
  return NextResponse.json({ error: link.error }, { status: 422 });
}
