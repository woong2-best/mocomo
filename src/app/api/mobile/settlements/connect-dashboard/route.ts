import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { createExpressDashboardLink } from "@/lib/settlement-express-connect";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlements-dashboard", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
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
