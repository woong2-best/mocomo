import { Suspense } from "react";
import { ExploreContentAsync } from "@/components/explore/explore-content-async";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { HeaderSearch } from "@/components/search/header-search";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 60;

export default function ExplorePage() {
  return (
    <AppPageChrome maxWidth="2xl" className="!px-3 sm:!px-4">
      <NativePageTitle>
        <FolkSectionTitle icon="sun">탐색</FolkSectionTitle>
      </NativePageTitle>

      <div className="max-sm:hidden">
        <HeaderSearch />
      </div>

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
    </AppPageChrome>
  );
}
