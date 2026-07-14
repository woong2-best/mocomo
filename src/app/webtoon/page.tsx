import { Suspense } from "react";
import Link from "next/link";
import { listIllustrationMarketFeed } from "@/actions/webtoon";
import { IllustrationMarketGrid } from "@/components/webtoon/illustration-market-grid";
import { IllustrationSortBar } from "@/components/webtoon/illustration-sort-bar";
import { WebtoonGenreBar } from "@/components/webtoon/webtoon-genre-bar";
import { parseIllustrationSort, parseWebtoonGenre } from "@/lib/webtoon/constants";

export const dynamic = "force-dynamic";

export default async function WebtoonHomePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; sort?: string }>;
}) {
  const { genre: genreRaw, sort: sortRaw } = await searchParams;
  const genre = parseWebtoonGenre(genreRaw);
  const sort = parseIllustrationSort(sortRaw);
  const items = await listIllustrationMarketFeed({ genre, sort }).catch(() => []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">일러스트 작품</h1>
          <p className="text-xs text-muted-foreground mt-1">
            픽시브형 열람·구매. 실물·주문제작·디지털 마켓은{" "}
            <Link href="/market" className="text-primary hover:underline">
              MARKET
            </Link>
            을 이용하세요.
          </p>
        </div>
        <Suspense fallback={<div className="h-9 w-40 rounded-lg bg-muted/50 animate-pulse" />}>
          <IllustrationSortBar active={sort} />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 w-16 rounded-full bg-muted/50 animate-pulse shrink-0" />
            ))}
          </div>
        }
      >
        <WebtoonGenreBar active={genre} />
      </Suspense>

      <IllustrationMarketGrid items={items} />
    </div>
  );
}
