import { Suspense } from "react";
import { listWebtoonWeeklyGrid } from "@/actions/webtoon";
import { WebtoonWeeklyGrid } from "@/components/webtoon/webtoon-weekly-grid";
import { WebtoonGenreBar } from "@/components/webtoon/webtoon-genre-bar";
import { parseWebtoonGenre } from "@/lib/webtoon/constants";

export const dynamic = "force-dynamic";

export default async function WebtoonHomePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre: genreRaw } = await searchParams;
  const genre = parseWebtoonGenre(genreRaw);
  const byDay = await listWebtoonWeeklyGrid(genre).catch(() => ({
    MON: [],
    TUE: [],
    WED: [],
    THU: [],
    FRI: [],
    SAT: [],
    SUN: [],
  }));

  return (
    <div className="space-y-4">
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
      <WebtoonWeeklyGrid byDay={byDay} activeGenre={genre} />
    </div>
  );
}
