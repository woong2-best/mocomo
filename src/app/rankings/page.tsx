import { getRankings } from "@/actions/events";
import { getTipRanking as getTips } from "@/actions/monetization";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default async function RankingsPage() {
  let posts: Awaited<ReturnType<typeof getRankings>> = [];
  let tips: Awaited<ReturnType<typeof getTips>> = [];
  try {
    [posts, tips] = await Promise.all([
      getRankings("posts"),
      getTips(10),
    ]);
  } catch {
    posts = [];
    tips = [];
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-400" />
        랭킹
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>후원 랭킹</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tips.length === 0 ? (
            <p className="text-muted-foreground text-sm">데이터 없음</p>
          ) : (
            tips.map((t) => (
              <div key={t.rank} className="flex items-center gap-3">
                <span className="font-bold text-neon-cyan w-6">#{t.rank}</span>
                {t.user ? (
                  <Link href={`/u/${t.user.username}`} className="hover:underline font-medium">
                    @{t.user.username}
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

      <Card>
        <CardHeader>
          <CardTitle>인기 게시물</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">데이터 없음</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="flex gap-2 py-1">
                <span className="text-neon-purple">#{p.rank}</span>
                <span className="text-sm">{p.entityType}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
