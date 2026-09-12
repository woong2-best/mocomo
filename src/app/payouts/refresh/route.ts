import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createExpressOnboardingLink,
  startExpressConnectOnboarding,
} from "@/lib/settlement-express-connect";

/** Account Link 만료 — 새 Express 온보딩 URL 발급 후 리다이렉트 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/payouts/refresh", req.url));
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    const started = await startExpressConnectOnboarding(session.user.id);
    if ("error" in started) {
      return NextResponse.redirect(new URL("/wallet?tab=earnings&connect=error", req.url));
    }
    return NextResponse.redirect(started.url);
  }

  const link = await createExpressOnboardingLink(user.stripeConnectAccountId);
  if ("error" in link) {
    return NextResponse.redirect(new URL("/wallet?tab=earnings&connect=error", req.url));
  }

  return NextResponse.redirect(link.url);
}
