import { Suspense } from "react";
import { SearchResultsAsync } from "@/components/search/search-results-async";
import { HashtagSearchResults } from "@/components/search/hashtag-search-results";
import { SearchPageChrome } from "@/components/search/search-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";
import { parseHashtagFromQuery } from "@/lib/hashtag-search";
import type { HashtagSort } from "@/lib/hashtag-search";

function parseSort(raw: string | undefined): HashtagSort {
  return raw === "latest" ? "latest" : "top";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort: sortParam } = await searchParams;
  const query = q?.trim() || "";
  const hashtagTag = parseHashtagFromQuery(query);
  const sort = parseSort(sortParam);

  return (
    <SearchPageChrome compact={!!hashtagTag}>
      {query ? (
        hashtagTag ? (
          <Suspense fallback={<CardRowsSkeleton rows={6} />}>
            <HashtagSearchResults tag={hashtagTag} sort={sort} />
          </Suspense>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              「<span className="font-medium text-foreground">{query}</span>」 결과
            </p>
            <Suspense fallback={<CardRowsSkeleton rows={8} />}>
              <SearchResultsAsync query={query} />
            </Suspense>
          </>
        )
      ) : (
        <p className="text-sm text-muted-foreground">사람, 애니, 게시물을 검색해 보세요.</p>
      )}
    </SearchPageChrome>
  );
}
