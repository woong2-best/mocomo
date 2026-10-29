import { Suspense } from "react";
import { SearchResultsAsync } from "@/components/search/search-results-async";
import { HashtagSearchResults } from "@/components/search/hashtag-search-results";
import { SearchPageChrome } from "@/components/search/search-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";
import { parseHashtagFromQuery } from "@/lib/hashtag-search";
import { parseSearchPageFilter } from "@/lib/search-page-shared";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; scope?: string; f?: string }>;
}) {
  const { q, sort: sortParam, scope: scopeParam, f: filterParam } = await searchParams;
  const query = q?.trim() || "";
  const scope = scopeParam === "social" ? "social" : "global";
  const hashtagTag = parseHashtagFromQuery(query);
  const filter = parseSearchPageFilter(filterParam ?? (sortParam === "latest" ? "latest" : undefined));
  const { t } = await getServerTranslator();

  return (
    <SearchPageChrome compact={!!query}>
      {query ? (
        hashtagTag ? (
          <Suspense fallback={<CardRowsSkeleton rows={6} />}>
            <HashtagSearchResults tag={hashtagTag} query={query} filter={filter} scope={scope} />
          </Suspense>
        ) : (
          <Suspense fallback={<CardRowsSkeleton rows={8} />}>
            <SearchResultsAsync query={query} scope={scope} filter={filter} />
          </Suspense>
        )
      ) : (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          {t("app.search.s1wbrezv")}
        </p>
      )}
    </SearchPageChrome>
  );
}
