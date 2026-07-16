import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { recomputeSearchTrends } from "@/lib/search/trends";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 검색어·Topic 인기 순위 주기 집계 (기본 10분) */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeSearchTrends(100);
    return NextResponse.json({ ...result });
  } catch (e) {
    console.error("[cron/search-trends]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "aggregate failed" },
      { status: 500 }
    );
  }
}
