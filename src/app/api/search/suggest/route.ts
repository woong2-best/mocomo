import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { suggestSearchQueries } from "@/lib/search/suggest";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "search-suggest", 90);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "검색어가 너무 깁니다." }, { status: 400 });
  }

  try {
    const suggestions = await suggestSearchQueries(q, 10);
    return NextResponse.json(
      { ok: true, query: q, suggestions },
      { headers: { "Cache-Control": "private, max-age=10" } }
    );
  } catch (e) {
    console.error("[api/search/suggest]", e);
    return NextResponse.json({ error: "추천 실패" }, { status: 500 });
  }
}
