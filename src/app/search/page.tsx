import { Suspense } from "react";
import { SearchResultsAsync } from "@/components/search/search-results-async";
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
      <h1 className="text-xl font-bold">검색: {query || "(없음)"}</h1>

      {query ? (
        <Suspense fallback={<CardRowsSkeleton rows={8} />}>
          <SearchResultsAsync query={query} />
        </Suspense>
      ) : null}
    </div>
  );
}
