import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { runFastSearch } from "@/lib/search-fast";

function normalizeSearchKey(q: string) {
  return q.trim().toLowerCase().slice(0, 80);
}

const cachedSearch = (key: string, q: string) =>
  unstable_cache(() => runFastSearch(q), ["fast-search-v1", key], { revalidate: 30 })();

/** 빠른 통합 검색 (JSON) — 동일 검색어 30초 캐시 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ error: "검색어는 2자 이상입니다." }, { status: 400 });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "검색어가 너무 깁니다." }, { status: 400 });
  }

  try {
    const key = normalizeSearchKey(q);
    const data = await cachedSearch(key, q);
    return NextResponse.json(
      { ok: true, query: q, ...data },
      { headers: { "Cache-Control": "private, max-age=20" } }
    );
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
