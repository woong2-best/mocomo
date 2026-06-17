import { Suspense } from "react";
import { SearchResultsAsync } from "@/components/search/search-results-async";
import { HeaderSearch } from "@/components/search/header-search";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">검색</h1>
      <HeaderSearch />

      {query ? (
        <>
          <p className="text-sm text-muted-foreground">
            「<span className="font-medium text-foreground">{query}</span>」 결과
          </p>
          <Suspense fallback={<CardRowsSkeleton rows={8} />}>
            <SearchResultsAsync query={query} />
          </Suspense>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">사람, 애니, 게시물을 검색해 보세요.</p>
      )}
    </div>
  );
}
