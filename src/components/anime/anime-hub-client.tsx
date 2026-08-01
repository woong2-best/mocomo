"use client";

import { Suspense } from "react";
import { Tv } from "lucide-react";
import type { AnimeGenre } from "@prisma/client";
import type { CultureWikiHubItem } from "@/lib/culture-wiki-hub-data";
import { AnimeAddButton } from "@/components/anime/anime-add-button";
import { AnimeWikiGuide } from "@/components/anime/anime-wiki-guide";
import { AnimeHubSearch } from "@/components/anime/anime-hub-search";
import { AnimeHubWidgets } from "@/components/anime/anime-hub-widgets";
import { AnimeGenreBar } from "@/components/anime/anime-genre-bar";
import { AnimeHubCatalog, type AnimeHubCatalogItem } from "@/components/anime/anime-hub-catalog";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { useLocale } from "@/components/providers/locale-provider";

export function AnimeHubClient({
  activeGenre,
  catalog,
  popular,
  recent,
  newHref,
}: {
  activeGenre: AnimeGenre | null;
  catalog: AnimeHubCatalogItem[];
  popular: CultureWikiHubItem[];
  recent: CultureWikiHubItem[];
  newHref: string;
}) {
  const { t } = useLocale();

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
        <div className="space-y-4 min-w-0">
          <section className="space-y-3">
            <Suspense
              fallback={
                <div className="flex gap-2 overflow-hidden">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-8 w-16 rounded-full bg-muted/50 animate-pulse shrink-0" />
                  ))}
                </div>
              }
            >
              <AnimeGenreBar active={activeGenre} />
            </Suspense>

            <AnimeHubCatalog
              items={catalog}
              emptyTitle={t("anime.catalogEmpty")}
              emptyHint={t("anime.catalogEmptyHint")}
              emptyLinkHref={newHref}
              emptyLinkLabel={t("anime.catalogEmptyLink")}
            />
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
