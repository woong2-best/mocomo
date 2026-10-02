import Link from "next/link";
import { redirect } from "next/navigation";
import { getWebtoonAuthorDashboard } from "@/actions/webtoon-studio-cloud";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WebtoonDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/webtoon/studio/dashboard");

  const stats = await getWebtoonAuthorDashboard().catch(() => null);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Creator dashboard</h2>
        <Link href="/webtoon/studio/draw" className="ml-auto">
          <Button size="sm" variant="outline" className="rounded-xl">
            드로잉 스튜디오
          </Button>
        </Link>
      </div>

      {!stats ? (
        <p className="text-sm text-muted-foreground">Couldn`t load stats.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Work", value: stats.seriesCount },
              { label: "Episode", value: stats.episodeCount },
              { label: "조회", value: stats.totalViews.toLocaleString() },
              { label: "Sales", value: stats.totalSales.toLocaleString() },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 p-4 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Estimated revenue (sum of prices): <strong className="text-foreground">{stats.revenue.toLocaleString()}원</strong>
          </p>

          {stats.upcoming.length > 0 && (
            <section>
              <h3 className="font-semibold text-sm mb-2">Scheduled to publish</h3>
              <ul className="space-y-2 text-sm">
                {stats.upcoming.map((e) => (
                  <li key={e.id} className="rounded-lg border border-border/60 px-3 py-2">
                    {e.seriesTitle} · {e.episodeNo}화 — {e.scheduledAt?.toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="font-semibold text-sm mb-2">Recent episodes</h3>
            <ul className="space-y-2 text-sm">
              {stats.episodes.map((e) => (
                <li key={e.id} className="flex justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span>
                    {e.seriesTitle} · {e.episodeNo}화
                  </span>
                  <span className="text-muted-foreground text-xs">
                    조회 {e.viewCount} · 판매 {e.salesCount}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
