import { db } from "@/lib/db";
import type { TrendPeriod } from "@/lib/search/trends";
import { getTrendingLive } from "@/lib/search/trends";

export async function getAdminSearchStatistics() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalLogs, logs24h, zero24h, clicks24h, recent, topQueries, topTopics, realtime, dayLogs] =
    await Promise.all([
      db.searchLog.count(),
      db.searchLog.count({ where: { createdAt: { gte: since24h } } }),
      db.searchLog.count({
        where: { createdAt: { gte: since24h }, resultCount: 0 },
      }),
      db.searchLog.count({
        where: { createdAt: { gte: since24h }, clickedId: { not: null } },
      }),
      db.searchLog.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalQuery: true,
          normalizedQuery: true,
          resultCount: true,
          country: true,
          locale: true,
          createdAt: true,
          topic: { select: { name: true } },
          user: { select: { username: true } },
        },
      }),
      getTrendingLive("query", "7d" as TrendPeriod, 20),
      getTrendingLive("topic", "7d" as TrendPeriod, 20),
      db.searchLog.findMany({
        take: 15,
        where: { createdAt: { gte: since24h } },
        orderBy: { createdAt: "desc" },
        select: { originalQuery: true, createdAt: true, resultCount: true },
      }),
      db.$queryRaw<{ day: Date; c: bigint }[]>`
        SELECT date_trunc('day', "createdAt") as day, count(*)::bigint as c
        FROM "SearchLog"
        WHERE "createdAt" >= ${since7d}
        GROUP BY 1
        ORDER BY 1 ASC
      `.catch(() => [] as { day: Date; c: bigint }[]),
    ]);

  return {
    totals: {
      all: totalLogs,
      last24h: logs24h,
      zeroResult24h: zero24h,
      clicks24h,
      ctr24h: logs24h > 0 ? clicks24h / logs24h : 0,
    },
    topQueries,
    topTopics,
    recent,
    realtime,
    volumeByDay: dayLogs.map((row) => ({
      day: new Date(row.day).toISOString().slice(0, 10),
      count: Number(row.c),
    })),
  };
}
