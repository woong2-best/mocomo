import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { startWalletStripeConnectOnboarding } from "@/lib/wallet-stripe-connect";
import { isSafeReturnPath } from "@/lib/safe-link";

/** Stripe Connect Express 온보딩 URL 발급 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "stripe-connect-onboard", 10);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let fromApp = false;
  let returnTo: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    fromApp = body?.fromApp === true;
    const rawReturn = typeof body?.returnTo === "string" ? body.returnTo : null;
    returnTo = rawReturn && isSafeReturnPath(rawReturn) ? rawReturn : null;
  } catch {
    // empty body ok
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      countryCode: true,
      stripeConnectAccountId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const result = await startWalletStripeConnectOnboarding({
    userId: session.user.id,
    email: user.email,
    countryCode: user.countryCode,
    stripeConnectAccountId: user.stripeConnectAccountId,
    urlContext: { fromApp, returnTo: returnTo ?? "/wallet?tab=earnings" },
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ url: result.url, accountId: result.accountId });
}
