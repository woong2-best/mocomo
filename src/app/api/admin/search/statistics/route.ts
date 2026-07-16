import { NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { getAdminSearchStatistics } from "@/lib/search/admin-stats";
import { getTrendingLive } from "@/lib/search/trends";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminPermission("statistics");
    const [stats, queriesToday, topicsToday] = await Promise.all([
      getAdminSearchStatistics(),
      getTrendingLive("query", "today", 50),
      getTrendingLive("topic", "today", 50),
    ]);
    return NextResponse.json({
      ok: true,
      statistics: stats.totals,
      volumeByDay: stats.volumeByDay,
      topQueries7d: stats.topQueries,
      topTopics7d: stats.topTopics,
      queriesToday,
      topicsToday,
      zeroResultRate24h:
        stats.totals.last24h > 0
          ? stats.totals.zeroResult24h / stats.totals.last24h
          : 0,
      ctr24h: stats.totals.ctr24h,
    });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[api/admin/search/statistics]", e);
    return NextResponse.json({ error: "통계 실패" }, { status: 500 });
  }
}
