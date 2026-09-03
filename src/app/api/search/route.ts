import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { enrichSearchUsersWithFollowStatus, runFastSearch } from "@/lib/search-fast";
import { resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

function normalizeSearchKey(q: string) {
  return q.trim().toLowerCase().slice(0, 80);
}

const cachedSearch = (key: string, q: string, canViewNsfw: boolean) =>
  unstable_cache(
    () => runFastSearch(q, canViewNsfw),
    ["fast-search-v3-nsfw", key, canViewNsfw ? "adult" : "safe"],
    { revalidate: 30 }
  )();

/** 빠른 통합 검색 (JSON) — 동일 검색어 30초 캐시 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "search", 60);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "검색어가 너무 깁니다." }, { status: 400 });
  }

  try {
    const key = normalizeSearchKey(q);
    const viewerId = await getAuthUserId();
    const canViewNsfw = await resolveCanViewNsfw(viewerId);
    const data = await cachedSearch(key, q, canViewNsfw);
    const users = await enrichSearchUsersWithFollowStatus(viewerId, data.users);
    // 미리보기(/api/search)는 집계하지 않음 — /search 페이지 진입 시 recordSearchEvent

    return NextResponse.json(
      { ok: true, query: q, ...data, users },
      { headers: { "Cache-Control": "private, max-age=15" } }
    );
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
