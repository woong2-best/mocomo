import { db } from "@/lib/db";

export type TrendPeriod = "today" | "7d" | "30d" | "all";
export type TrendKind = "query" | "topic";

function periodStart(period: TrendPeriod): Date | null {
  const now = Date.now();
  if (period === "all") return null;
  if (period === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

type AggRow = { refId: string; count: bigint };

async function aggregateLogs(
  kind: TrendKind,
  period: TrendPeriod,
  limit: number
): Promise<{ refId: string; count: number; label: string }[]> {
  if (period === "all") {
    if (kind === "query") {
      const rows = await db.searchQuery.findMany({
        take: limit,
        orderBy: [{ searchCount: "desc" }, { lastSearchedAt: "desc" }],
        select: {
          id: true,
          displayQuery: true,
          normalizedQuery: true,
          searchCount: true,
        },
      });
      return rows.map((r) => ({
        refId: r.id,
        count: r.searchCount,
        label: r.displayQuery || r.normalizedQuery,
      }));
    }
    const rows = await db.searchTopic.findMany({
      take: limit,
      orderBy: { searchCount: "desc" },
      select: { id: true, name: true, searchCount: true },
    });
    return rows.map((r) => ({
      refId: r.id,
      count: r.searchCount,
      label: r.name,
    }));
  }

  const since = periodStart(period)!;
  if (kind === "query") {
    const groups = await db.$queryRaw<AggRow[]>`
      SELECT "queryId" as "refId", COUNT(*)::bigint as count
      FROM "SearchLog"
      WHERE "queryId" IS NOT NULL AND "createdAt" >= ${since}
      GROUP BY "queryId"
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    const ids = groups.map((g) => g.refId);
    const qs = await db.searchQuery.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayQuery: true, normalizedQuery: true },
    });
    const map = new Map(qs.map((q) => [q.id, q]));
    return groups.map((g) => {
      const q = map.get(g.refId);
      return {
        refId: g.refId,
        count: Number(g.count),
        label: q?.displayQuery || q?.normalizedQuery || "?",
      };
    });
  }

  const groups = await db.$queryRaw<AggRow[]>`
    SELECT "topicId" as "refId", COUNT(*)::bigint as count
    FROM "SearchLog"
    WHERE "topicId" IS NOT NULL AND "createdAt" >= ${since}
    GROUP BY "topicId"
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  const ids = groups.map((g) => g.refId);
  const ts = await db.searchTopic.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const map = new Map(ts.map((t) => [t.id, t]));
  return groups.map((g) => ({
    refId: g.refId,
    count: Number(g.count),
    label: map.get(g.refId)?.name || "?",
  }));
}

/** SearchLog 기반 기간별 집계 → SearchTrendSnapshot 갱신 */
export async function recomputeSearchTrends(limit = 100) {
  const periods: TrendPeriod[] = ["today", "7d", "30d", "all"];
  const kinds: TrendKind[] = ["query", "topic"];
  const computedAt = new Date();

  for (const period of periods) {
    for (const kind of kinds) {
      const rows = await aggregateLogs(kind, period, limit);
      await db.searchTrendSnapshot.deleteMany({ where: { period, kind } });
      if (rows.length) {
        await db.searchTrendSnapshot.createMany({
          data: rows.map((r, i) => ({
            period,
            kind,
            rank: i + 1,
            refId: r.refId,
            label: r.label,
            count: r.count,
            computedAt,
          })),
        });
      }
    }
  }

  return { ok: true as const, computedAt };
}

export async function getTrendingFromSnapshot(
  kind: TrendKind,
  period: TrendPeriod = "7d",
  limit = 10
) {
  const rows = await db.searchTrendSnapshot.findMany({
    where: { period, kind },
    orderBy: { rank: "asc" },
    take: Math.min(limit, 100),
  });

  const stale =
    !rows.length ||
    (rows[0] && Date.now() - rows[0].computedAt.getTime() > 15 * 60 * 1000);

  if (stale) {
    return getTrendingLive(kind, period, limit);
  }

  return rows.map((r) => ({
    rank: r.rank,
    id: r.refId,
    label: r.label,
    count: r.count,
  }));
}

export async function getTrendingLive(
  kind: TrendKind,
  period: TrendPeriod,
  limit = 10
) {
  const take = Math.min(limit, 100);
  const rows = await aggregateLogs(kind, period, take);
  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.refId,
    label: r.label,
    count: r.count,
  }));
}
