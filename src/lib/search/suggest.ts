import { db } from "@/lib/db";
import { normalizeSearchQuery } from "@/lib/search/normalize";

/** 자동완성 — 검색량·최근·클릭률 가중 */
export async function suggestSearchQueries(prefix: string, limit = 8) {
  const q = prefix.trim();
  if (q.length < 1) return [];
  const normalized = normalizeSearchQuery(q);
  if (!normalized) return [];

  const rows = await db.searchQuery.findMany({
    where: {
      OR: [
        { normalizedQuery: { startsWith: normalized } },
        { displayQuery: { contains: q, mode: "insensitive" } },
        { variants: { some: { originalQuery: { startsWith: q } } } },
      ],
    },
    take: Math.min(limit * 3, 40),
    orderBy: [{ searchCount: "desc" }, { lastSearchedAt: "desc" }],
    select: {
      id: true,
      displayQuery: true,
      normalizedQuery: true,
      searchCount: true,
      clickCount: true,
      lastSearchedAt: true,
    },
  });

  const scored = rows
    .map((r) => {
      const ctr = r.searchCount > 0 ? r.clickCount / r.searchCount : 0;
      const recency =
        r.lastSearchedAt != null
          ? Math.max(0, 1 - (Date.now() - r.lastSearchedAt.getTime()) / (14 * 864e5))
          : 0;
      const score = r.searchCount * 1 + ctr * 40 + recency * 20;
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((r) => ({
    query: r.displayQuery || r.normalizedQuery,
    normalized: r.normalizedQuery,
    count: r.searchCount,
  }));
}

/** 연관 검색어 — 같은 Topic 내 다른 Keyword */
export async function getRelatedSearchQueries(raw: string, limit = 8) {
  const normalized = normalizeSearchQuery(raw);
  if (!normalized) return [];

  const current = await db.searchQuery.findUnique({
    where: { normalizedQuery: normalized },
    select: { id: true, topicId: true },
  });
  if (!current?.topicId) {
    // fallback: prefix 유사
    return suggestSearchQueries(raw, limit);
  }

  const related = await db.searchQuery.findMany({
    where: {
      topicId: current.topicId,
      id: { not: current.id },
    },
    orderBy: { searchCount: "desc" },
    take: limit,
    select: {
      displayQuery: true,
      normalizedQuery: true,
      searchCount: true,
    },
  });

  return related.map((r) => ({
    query: r.displayQuery || r.normalizedQuery,
    normalized: r.normalizedQuery,
    count: r.searchCount,
  }));
}
