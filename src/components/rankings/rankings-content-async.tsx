import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCachedRankingsData } from "@/lib/cached-data";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";

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
    <>
      <Card interactive>
        <CardHeader>
          <CardTitle>후원 랭킹</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 moco-stagger">
          {tips.length === 0 ? (
            <p className="text-muted-foreground text-sm">데이터 없음</p>
          ) : (
            tips.map((t) => (
              <div key={t.rank} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
                <span className="font-bold text-neon-cyan w-6">#{t.rank}</span>
                {t.user ? (
                  <Link href={`/u/${t.user.username}`} className="hover:underline">
                    <DisplayNameWithSupportTier
                      name={`@${t.user.username}`}
                      tier={t.user.supportTierSent ?? "PEBBLE"}
                      nameClassName="font-medium"
                      compact
                    />
                  </Link>
                ) : (
                  <span>—</span>
                )}
                <span className="ml-auto text-sm">{t.total?.toLocaleString()}원</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card interactive>
        <CardHeader>
          <CardTitle>인기 게시물</CardTitle>
        </CardHeader>
        <CardContent className="moco-stagger">
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">데이터 없음</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="flex gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                <span className="text-neon-purple">#{p.rank}</span>
                <span className="text-sm">{p.entityType}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
