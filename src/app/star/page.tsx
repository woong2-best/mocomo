import { Suspense } from "react";
import { Star } from "lucide-react";
import { StarContentAsync } from "@/components/star/star-content-async";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { GridCardsSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default function StarPage() {
  return (
    <AppPageChrome maxWidth="5xl">
      <NativePageTitle>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          STAR
        </h1>
        <p className="text-sm text-muted-foreground">저장한 게시물 · 팔로우 크리에이터별 필터</p>
      </NativePageTitle>

      <Suspense fallback={<GridCardsSkeleton count={4} />}>
        <StarContentAsync />
      </Suspense>
    </AppPageChrome>
  );
}
