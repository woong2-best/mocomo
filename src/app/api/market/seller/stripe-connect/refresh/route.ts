import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshSellerConnectLink } from "@/lib/stripe-connect";
import { isSafeReturnPath } from "@/lib/safe-link";

/** Account Link 만료 시 refresh_url — 새 onboarding 링크 발급 후 리다이렉트 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/market/seller/register", req.url));
  }

  const fromApp = req.nextUrl.searchParams.get("app") === "1";
  const returnRaw = req.nextUrl.searchParams.get("return");
  const returnTo =
    typeof returnRaw === "string" && isSafeReturnPath(returnRaw) ? returnRaw : null;

  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    return NextResponse.redirect(new URL("/market/seller/register", req.url));
  }

  const link = await refreshSellerConnectLink(user.stripeConnectAccountId, {
    fromApp,
    returnTo,
  });
  if ("error" in link) {
    return NextResponse.redirect(
      new URL(`/market/seller/register?connect=error`, req.url)
    );
  }

  return NextResponse.redirect(link.url);
}
