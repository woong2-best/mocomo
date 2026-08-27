import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { refreshStarMarketRankingCaches } from "@/lib/market-ranking";
import { refreshUsedMarketRankingCaches } from "@/lib/used-ranking";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Star Market + 중고 랭킹 캐시 배치 갱신 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [starMarket, usedMarket] = await Promise.all([
      refreshStarMarketRankingCaches({ limit: 100 }),
      refreshUsedMarketRankingCaches({ limit: 100 }),
    ]);
    return NextResponse.json({ ok: true, starMarket, usedMarket });
  } catch (e) {
    console.error("[cron/commerce-ranking]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
