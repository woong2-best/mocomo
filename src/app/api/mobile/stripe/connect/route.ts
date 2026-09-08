import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { startWalletStripeConnectOnboarding, getWalletStripeConnectStatus } from "@/lib/wallet-stripe-connect";
import { isSafeReturnPath } from "@/lib/safe-link";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-stripe-connect-status", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const status = await getWalletStripeConnectStatus(auth.user.id);
  return NextResponse.json({
    stripeOnboardingCompleted: status.stripeOnboardingCompleted,
    stripeConnectAccountId: status.stripeConnectAccountId,
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-stripe-connect-onboard", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let returnTo: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const rawReturn = typeof body?.returnTo === "string" ? body.returnTo : null;
    returnTo = rawReturn && isSafeReturnPath(rawReturn) ? rawReturn : null;
  } catch {
    // empty body ok
  }

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
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
    userId: auth.user.id,
    email: user.email,
    countryCode: user.countryCode,
    stripeConnectAccountId: user.stripeConnectAccountId,
    urlContext: { fromApp: true, returnTo: returnTo ?? "/wallet?tab=earnings" },
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ url: result.url, accountId: result.accountId });
}
