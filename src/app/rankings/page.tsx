import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { RankingsContentAsync } from "@/components/rankings/rankings-content-async";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 120;

export default function RankingsPage() {
  return (
    <AppPageChrome maxWidth="3xl">
      <NativePageTitle>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-400" />
          랭킹
        </h1>
      </NativePageTitle>

      <Suspense
        fallback={
          <div className="space-y-6">
            <CardRowsSkeleton rows={5} />
            <CardRowsSkeleton rows={5} />
          </div>
        }
      >
        <RankingsContentAsync />
      </Suspense>
    </AppPageChrome>
  );
}
