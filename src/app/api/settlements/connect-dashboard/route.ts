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
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    return NextResponse.json({ error: "연동된 정산 계정이 없습니다." }, { status: 422 });
  }

  const result = await createExpressDashboardLink(user.stripeConnectAccountId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ url: result.url });
}
