import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { enrichSearchUsersWithFollowStatus, runFastSearch } from "@/lib/search-fast";

function normalizeSearchKey(q: string) {
  return q.trim().toLowerCase().slice(0, 80);
}

const cachedSearch = (key: string, q: string) =>
  unstable_cache(() => runFastSearch(q), ["fast-search-v2", key], { revalidate: 30 })();

/** 빠른 통합 검색 (JSON) — 동일 검색어 30초 캐시 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "검색어가 너무 깁니다." }, { status: 400 });
  }

  try {
    const key = normalizeSearchKey(q);
    const data = await cachedSearch(key, q);
    const viewerId = await getAuthUserId();
    const users = await enrichSearchUsersWithFollowStatus(viewerId, data.users);

    return NextResponse.json(
      { ok: true, query: q, ...data, users },
      { headers: { "Cache-Control": "private, max-age=15" } }
    );
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
