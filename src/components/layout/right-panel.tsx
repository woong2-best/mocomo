import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Tv } from "lucide-react";
import { getTipRanking } from "@/actions/monetization";

export async function RightPanel() {
  let animes: { id: string; slug: string; title: string; coverUrl: string | null }[] = [];
  let tips: Awaited<ReturnType<typeof getTipRanking>> = [];

  try {
    [animes, tips] = await Promise.all([
      db.anime.findMany({ take: 5, orderBy: { followerCount: "desc" } }),
      getTipRanking(5),
    ]);
  } catch {
    animes = [];
    tips = [];
  }

  return (
    <aside className="hidden xl:block w-72 shrink-0 p-4 space-y-3 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto bg-muted/20 border-l border-border">
      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <Tv className="h-4 w-4 text-[#1e88e5]" />
            인기 애니
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {animes.length === 0 ? (
            <p className="text-xs text-muted-foreground">목록 없음</p>
          ) : (
            animes.map((a) => (
              <Link
                key={a.id}
                href={`/anime/${a.slug}`}
                className="block text-sm hover:text-[#1e88e5] truncate py-0.5"
              >
                {a.title}
              </Link>
            ))
          )}
          <Link href="/anime" className="text-xs font-medium text-[#5e35b1] hover:underline">
            더보기
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4 text-[#fb8c00]" />
            후원 랭킹
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tips.length === 0 ? (
            <p className="text-xs text-muted-foreground">목록 없음</p>
          ) : (
            tips.map((t) => (
              <div key={t.rank} className="flex justify-between text-xs py-0.5">
                <span>#{t.rank} {t.user?.username}</span>
                <span className="text-muted-foreground tabular-nums">
                  {(t.total ?? 0).toLocaleString()}원
                </span>
              </div>
            ))
          )}
          <Link href="/rankings" className="text-xs font-medium text-[#5e35b1] hover:underline">
            더보기
          </Link>
        </CardContent>
      </Card>
    </aside>
  );
}
