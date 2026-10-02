import { errorText } from "@/lib/i18n/error-text";
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
    return NextResponse.json({ error: "Connect your Stripe payout account first." }, { status: 400 });
  }

  const link = await createWalletConnectDashboardLink(status.stripeConnectAccountId);
  if ("error" in link) {
    return NextResponse.json({ error: errorText(link.error) }, { status: 422 });
  }

  return NextResponse.json({ url: link.url });
}
