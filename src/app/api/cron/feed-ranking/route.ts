import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { refreshFeedRankingCaches } from "@/lib/feed-ranking";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** For You 피드 랭킹 캐시 배치 갱신 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recs = await refreshFeedRankingCaches({ limit: 150 });
    return NextResponse.json({ ok: true, recs });
  } catch (e) {
    console.error("[cron/feed-ranking]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
