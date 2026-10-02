import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { startExpressConnectOnboarding } from "@/lib/settlement-express-connect";

/** Stripe Express Hosted Onboarding URL 발급 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlements-connect-account", 10);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requestCardPayments = body?.requestCardPayments === true;
  const payoutCountry = typeof body?.payoutCountry === "string" ? body.payoutCountry : undefined;

  const result = await startExpressConnectOnboarding(session.user.id, {
    requestCardPayments,
    payoutCountry,
  });

  if ("error" in result) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 422 });
  }

  return NextResponse.json({ url: result.url, accountId: result.accountId });
}
