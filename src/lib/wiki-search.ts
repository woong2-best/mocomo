import { db } from "@/lib/db";
import { recordSearchEvent } from "@/lib/search/record";

/** @deprecated 새 검색 파이프라인(recordSearchEvent)으로 위임 */
export async function logWikiSearchQuery(raw: string) {
  const query = raw.trim();
  if (query.length < 1) return;
  try {
    await recordSearchEvent({ rawQuery: query });
    // 레거시 테이블도 유지 (점진적 이전)
    const key = query.toLowerCase().slice(0, 80);
    if (key.length >= 2) {
      await db.wikiSearchQuery.upsert({
        where: { query: key },
        create: { query: key, count: 1 },
        update: { count: { increment: 1 } },
      });
    }
  } catch (e) {
    console.error("[wiki-search]", e);
  }
}

export async function getPopularWikiSearchQueries(limit = 8) {
  try {
    return await db.wikiSearchQuery.findMany({
      take: limit,
      orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
      select: { query: true, count: true },
    });
  } catch {
    return [];
  }
}
