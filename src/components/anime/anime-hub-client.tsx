"use client";

import Link from "next/link";
import type { AnimeGenre } from "@prisma/client";
import { Camera, Tv } from "lucide-react";
import { genreToParam } from "@/lib/anime-genres";
import { getLocalizedAnimeGenres } from "@/lib/anime-genres-i18n";
import type { CultureWikiHubItem } from "@/lib/culture-wiki-hub-data";
import { Card, CardContent } from "@/components/ui/card";
import { AnimeAddButton } from "@/components/anime/anime-add-button";
import { AnimeWikiGuide } from "@/components/anime/anime-wiki-guide";
import { AnimeHubSearch } from "@/components/anime/anime-hub-search";
import { AnimeHubWidgets } from "@/components/anime/anime-hub-widgets";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { useLocale } from "@/components/providers/locale-provider";

export function AnimeHubClient({
  countMap,
  popular,
  recent,
  cosplayerCount,
}: {
  countMap: Record<string, number>;
  popular: CultureWikiHubItem[];
  recent: CultureWikiHubItem[];
  cosplayerCount: number;
}) {
  const { t, locale } = useLocale();
  const genres = getLocalizedAnimeGenres(locale);

  return (
    <AppPageChrome maxWidth="6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <NativePageTitle>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tv className="h-7 w-7 text-neon-cyan" />
            {t("anime.wikiTitle")}
          </h1>
        </NativePageTitle>
        <AnimeAddButton />
      </div>

      <AnimeHubSearch />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6 min-w-0">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("anime.browseByGenre")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 moco-stagger">
              {genres.map((g) => {
                const count = countMap[g.id as AnimeGenre] ?? 0;
                return (
                  <Link key={g.id} href={`/anime/list/${genreToParam(g.id)}`}>
                    <Card interactive className="h-full rounded-2xl hover:border-primary/40 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl" aria-hidden>
                            {g.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-lg">{g.label}</h2>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.description}</p>
                            <p className="text-xs text-neon-cyan mt-3">
                              {t("anime.postCount", { count: String(count) })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              <Link href="/cosplay/profiles">
                <Card interactive className="h-full rounded-2xl hover:border-pink-500/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl" aria-hidden>
                        📸
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-lg flex items-center gap-1.5">
                          <Camera className="h-4 w-4 text-pink-500 shrink-0" />
                          {t("anime.cosplayerHubTitle")}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {t("anime.cosplayerHubDesc")}
                        </p>
                        <p className="text-xs text-pink-600 dark:text-pink-400 mt-3">
                          {t("anime.cosplayerCount", { count: String(cosplayerCount) })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          <AnimeWikiGuide />
        </div>

        <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <AnimeHubWidgets popular={popular} recent={recent} />
        </aside>
      </div>
    </AppPageChrome>
  );
}
