"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { Suspense } from "react";
import { Tv } from "lucide-react";
import type { AnimeGenre } from "@prisma/client";
import type { CultureWikiHubItem } from "@/lib/culture-wiki-hub-data";
import { AnimeAddButton } from "@/components/anime/anime-add-button";
import { AnimeHubWidgets } from "@/components/anime/anime-hub-widgets";
import { AnimeGenreBar } from "@/components/anime/anime-genre-bar";
import { AnimeHubCatalog, type AnimeHubCatalogItem } from "@/components/anime/anime-hub-catalog";
import { AnimeHubPagination } from "@/components/anime/anime-hub-pagination";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { useLocale } from "@/components/providers/locale-provider";

export function AnimeHubClient({
  activeGenre,
  catalog,
  popular,
  recent,
  newHref,
  currentPage,
  totalPages,
  genreParam,
  searchQuery,
}: {
  activeGenre: AnimeGenre | null;
  catalog: AnimeHubCatalogItem[];
  popular: CultureWikiHubItem[];
  recent: CultureWikiHubItem[];
  newHref: string;
  currentPage: number;
  totalPages: number;
  genreParam: string | null;
  searchQuery: string;
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

            <AnimeHubPagination
              currentPage={currentPage}
              totalPages={totalPages}
              genreParam={genreParam}
              q={searchQuery}
            />
          </section>
        </div>

        <aside className="min-w-0 lg:min-h-0">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+0.5rem)] lg:max-h-[calc(100dvh-var(--header-h)-1rem)] lg:overflow-y-auto lg:overscroll-contain">
            <AnimeHubWidgets popular={popular} recent={recent} />
          </div>
        </aside>
      </div>
    </AppPageChrome>
  );
}
