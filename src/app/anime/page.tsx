import Link from "next/link";
import { ANIME_GENRES } from "@/lib/anime-genres";
import { Card, CardContent } from "@/components/ui/card";
import { Tv } from "lucide-react";
import { genreToParam } from "@/lib/anime-genres";
import { AnimeAddButton } from "@/components/anime/anime-add-button";
import { AnimeWikiGuide } from "@/components/anime/anime-wiki-guide";
import { AnimeHubSearch } from "@/components/anime/anime-hub-search";
import { AnimeHubWidgets } from "@/components/anime/anime-hub-widgets";
import {
  getCachedAnimeGenreCounts,
  getCachedPopularAnime,
  getCachedRecentAnime,
} from "@/lib/cached-data";
import { repairBrokenAnimeSlugs } from "@/lib/anime-wiki-seeds";
import { db } from "@/lib/db";

export const revalidate = 120;

export default async function AnimeHubPage() {
  try {
    await repairBrokenAnimeSlugs(db);
  } catch {
    /* DB 미연결 시 무시 */
  }

  let counts: Awaited<ReturnType<typeof getCachedAnimeGenreCounts>> = [];
  let popular: Awaited<ReturnType<typeof getCachedPopularAnime>> = [];
  let recent: Awaited<ReturnType<typeof getCachedRecentAnime>> = [];

  try {
    [counts, popular, recent] = await Promise.all([
      getCachedAnimeGenreCounts(),
      getCachedPopularAnime(),
      getCachedRecentAnime(),
    ]);
  } catch {
    counts = [];
    popular = [];
    recent = [];
  }

  const countMap = Object.fromEntries(counts.map((c) => [c.genre, c._count.id]));

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="h-7 w-7 text-neon-cyan" />
          애니 위키
        </h1>
        <AnimeAddButton />
      </div>

      <AnimeHubSearch />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6 min-w-0">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">장르로 찾기</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {ANIME_GENRES.map((g) => {
                const count = countMap[g.id] ?? 0;
                return (
                  <Link key={g.id} href={`/anime/list/${genreToParam(g.id)}`}>
                    <Card className="h-full rounded-2xl hover:border-primary/40 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl" aria-hidden>
                            {g.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-lg">{g.label}</h2>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.description}</p>
                            <p className="text-xs text-neon-cyan mt-3">{count}개 글</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          <AnimeWikiGuide />
        </div>

        <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <AnimeHubWidgets popular={popular} recent={recent} />
        </aside>
      </div>
    </div>
  );
}
