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
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requestCardPayments = body?.requestCardPayments === true;

  const result = await startExpressConnectOnboarding(session.user.id, {
    requestCardPayments,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ url: result.url, accountId: result.accountId });
}
