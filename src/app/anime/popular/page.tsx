import Link from "next/link";
import { ChevronLeft, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCachedPopularAnime } from "@/lib/cached-data";

export const revalidate = 120;

export default async function AnimePopularPage() {
  let animes: Awaited<ReturnType<typeof getCachedPopularAnime>> = [];
  try {
    animes = await getCachedPopularAnime();
  } catch {
    animes = [];
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/anime">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          애니 위키
        </Button>
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Flame className="h-7 w-7 text-orange-500" />
        인기 글
      </h1>
      <p className="text-sm text-muted-foreground">조회수(클릭) 기준 실시간 인기 순위입니다.</p>
      <ol className="space-y-2">
        {animes.length === 0 ? (
          <li className="text-muted-foreground text-sm">아직 데이터가 없습니다.</li>
        ) : (
          animes.map((a, i) => (
            <li key={a.slug}>
              <Link href={`/anime/${a.slug}`} className="flex items-baseline gap-3 text-sm hover:text-[#1e88e5]">
                <span className="w-8 text-right font-bold text-[#1e88e5] tabular-nums">{i + 1}</span>
                <span className="font-medium flex-1">{a.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{a.viewCount.toLocaleString()}회</span>
              </Link>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
