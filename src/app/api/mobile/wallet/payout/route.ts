import { NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

/** @deprecated 월말 자동 Reward 지급으로 대체 */
export async function POST(req: Request) {
  const limited = await rateLimitPublicApi(req as import("next/server").NextRequest, "mobile-wallet-payout", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req as import("next/server").NextRequest, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  return NextResponse.json(
    {
      error:
        "수동 출금은 지원하지 않습니다. 정산 MOCO는 매월 말 크리에이터 활동 성과 보수(Reward)로 자동 지급됩니다.",
    },
    { status: 410 }
  );
}
