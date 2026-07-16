import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getTrendingFromSnapshot, type TrendPeriod } from "@/lib/search/trends";

const PERIODS = new Set(["today", "7d", "30d", "all"]);

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "search-trending", 60);
  if (limited) return limited;

  const periodParam = req.nextUrl.searchParams.get("period") ?? "7d";
  const period = (PERIODS.has(periodParam) ? periodParam : "7d") as TrendPeriod;
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? "10") || 10,
    100
  );

  try {
    const [queries, topics] = await Promise.all([
      getTrendingFromSnapshot("query", period, limit),
      getTrendingFromSnapshot("topic", period, limit),
    ]);
    return NextResponse.json(
      { ok: true, period, queries, topics },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (e) {
    console.error("[api/search/trending]", e);
    return NextResponse.json({ error: "트렌드 조회 실패" }, { status: 500 });
  }
}
