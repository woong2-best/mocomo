import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { createExpressDashboardLink } from "@/lib/settlement-express-connect";

/** Stripe Express Dashboard (계좌 정보 수정) */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlements-connect-dashboard", 10);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    return NextResponse.json({ error: "Not found." }, { status: 422 });
  }

  const result = await createExpressDashboardLink(user.stripeConnectAccountId);
  if ("error" in result) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 422 });
  }

  return NextResponse.json({ url: result.url });
}
