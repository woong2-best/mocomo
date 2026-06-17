import { Suspense } from "react";
import { ExploreContentAsync } from "@/components/explore/explore-content-async";
import { HeaderSearch } from "@/components/search/header-search";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 60;

export default function ExplorePage() {
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-8">
      <FolkSectionTitle icon="sun">탐색</FolkSectionTitle>
      <HeaderSearch />

      <Suspense
        fallback={
          <div className="space-y-8">
            <CardRowsSkeleton rows={4} />
            <CardRowsSkeleton rows={3} />
          </div>
        }
      >
        <ExploreContentAsync />
      </Suspense>
    </div>
  );
}
