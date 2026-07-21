import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import {
  refreshFollowRecommendationCaches,
  snapshotUserGrowth,
} from "@/lib/follow-recommendations";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** 성장률 스냅샷 + 팔로우 추천 캐시 갱신 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const growth = await snapshotUserGrowth({ activeDays: 14, limit: 400 });
    const recs = await refreshFollowRecommendationCaches({ limit: 150 });
    return NextResponse.json({ ok: true, growth, recs });
  } catch (e) {
    console.error("[cron/follow-recommendations]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
