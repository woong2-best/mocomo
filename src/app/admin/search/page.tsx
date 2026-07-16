import { getAdminSearchStatistics } from "@/lib/search/admin-stats";
import { getTrendingLive } from "@/lib/search/trends";

export const dynamic = "force-dynamic";

export default async function AdminSearchPage() {
  const [stats, todayQueries, todayTopics] = await Promise.all([
    getAdminSearchStatistics(),
    getTrendingLive("query", "today", 30),
    getTrendingLive("topic", "today", 20),
  ]);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">검색 통계</h1>
        <p className="text-sm text-muted-foreground">
          실시간 검색어 · TOP Keyword/Topic · 실패(결과 없음) · 클릭률
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="전체 검색" value={stats.totals.all} />
        <StatCard label="24시간 검색" value={stats.totals.last24h} />
        <StatCard label="24h 결과 없음" value={stats.totals.zeroResult24h} />
        <StatCard
          label="24h CTR"
          value={`${(stats.totals.ctr24h * 100).toFixed(1)}%`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RankTable title="TOP 검색어 (7일)" rows={stats.topQueries} />
        <RankTable title="TOP Topic (7일)" rows={stats.topTopics} />
        <RankTable title="오늘 검색어" rows={todayQueries} />
        <RankTable title="오늘 Topic" rows={todayTopics} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">검색량 변화 (7일)</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7 text-sm">
          {stats.volumeByDay.map((d) => (
            <li key={d.day} className="rounded-lg border p-2">
              <p className="text-xs text-muted-foreground">{d.day}</p>
              <p className="font-semibold tabular-nums">{d.count}</p>
            </li>
          ))}
          {!stats.volumeByDay.length ? (
            <li className="text-sm text-muted-foreground">데이터 없음</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">최근 검색 / 실시간</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2">시간</th>
                <th className="p-2">원본</th>
                <th className="p-2">정규화</th>
                <th className="p-2">Topic</th>
                <th className="p-2">결과</th>
                <th className="p-2">국가</th>
                <th className="p-2">회원</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-2 whitespace-nowrap text-xs">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2">{row.originalQuery}</td>
                  <td className="p-2 font-mono text-xs">{row.normalizedQuery}</td>
                  <td className="p-2">{row.topic?.name ?? "—"}</td>
                  <td className="p-2 tabular-nums">
                    <span className={row.resultCount === 0 ? "text-destructive" : ""}>
                      {row.resultCount}
                    </span>
                  </td>
                  <td className="p-2">{row.country ?? "—"}</td>
                  <td className="p-2">{row.user?.username ?? "guest"}</td>
                </tr>
              ))}
              {!stats.recent.length ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    아직 검색 로그가 없습니다. 사이트에서 검색하면 여기에 표시됩니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function RankTable({
  title,
  rows,
}: {
  title: string;
  rows: { rank: number; label: string; count: number }[];
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ol className="divide-y rounded-lg border">
        {rows.map((r) => (
          <li key={`${r.rank}-${r.label}`} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="w-6 font-bold tabular-nums text-muted-foreground">{r.rank}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{r.count}</span>
          </li>
        ))}
        {!rows.length ? (
          <li className="p-3 text-sm text-muted-foreground">데이터 없음</li>
        ) : null}
      </ol>
    </div>
  );
}
