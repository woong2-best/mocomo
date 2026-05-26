import { Suspense } from "react";
import { Compass } from "lucide-react";
import { ExploreContentAsync } from "@/components/explore/explore-content-async";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 60;

export default function ExplorePage() {
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Compass className="h-7 w-7 text-primary" />
        탐색
      </h1>

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
