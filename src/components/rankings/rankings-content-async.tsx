import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";
import { getCachedRankingsData } from "@/lib/cached-data";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { PageSection } from "@/components/layout/page-section";

export async function RankingsContentAsync() {
  let posts: Awaited<ReturnType<typeof getCachedRankingsData>>["posts"] = [];
  let tips: Awaited<ReturnType<typeof getCachedRankingsData>>["tips"] = [];

  try {
    const data = await getCachedRankingsData();
    posts = data.posts;
    tips = data.tips;
  } catch {
    posts = [];
    tips = [];
  }

  return (
    <div className="space-y-6">
      <PageSection title="후원 랭킹" icon={Trophy} variant="card">
        <div className="space-y-2 moco-stagger">
          {tips.length === 0 ? (
            <p className="text-muted-foreground text-sm">데이터 없음</p>
          ) : (
            tips.map((t) => (
              <div
                key={t.rank}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors"
              >
                <span className="font-bold text-neon-cyan w-6 tabular-nums">#{t.rank}</span>
                {t.user ? (
                  <Link href={`/u/${t.user.username}`} className="hover:underline min-w-0">
                    <DisplayNameWithSupportTier
                      name={`@${t.user.username}`}
                      tier={t.user.supportTierSent ?? "SEED"}
                      nameClassName="font-medium"
                      compact
                    />
                  </Link>
                ) : (
                  <span>—</span>
                )}
                <span className="ml-auto text-sm tabular-nums">{t.total?.toLocaleString()}원</span>
              </div>
            ))
          )}
        </div>
      </PageSection>

      <PageSection title="인기 게시물" icon={TrendingUp} variant="card">
        <div className="moco-stagger">
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">데이터 없음</p>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                className="flex gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <span className="text-neon-purple tabular-nums">#{p.rank}</span>
                <span className="text-sm">{p.entityType}</span>
              </div>
            ))
          )}
        </div>
      </PageSection>
    </div>
  );
}
