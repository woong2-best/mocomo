import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { startExpressConnectOnboarding } from "@/lib/settlement-express-connect";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlements-connect", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const requestCardPayments = body?.requestCardPayments === true;
  const payoutCountry = typeof body?.payoutCountry === "string" ? body.payoutCountry : undefined;

  const result = await startExpressConnectOnboarding(auth.user.id, {
    requestCardPayments,
    payoutCountry,
  });
  if ("error" in result) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 422 });
  }

  return NextResponse.json({ url: result.url, accountId: result.accountId });
}
