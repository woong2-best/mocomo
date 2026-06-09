import { db } from "@/lib/db";

export async function logWikiSearchQuery(raw: string) {
  const query = raw.trim().toLowerCase().slice(0, 80);
  if (query.length < 2) return;
  try {
    await db.wikiSearchQuery.upsert({
      where: { query },
      create: { query, count: 1 },
      update: { count: { increment: 1 } },
    });
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
