import { Suspense } from "react";
import { Star } from "lucide-react";
import { StarContentAsync } from "@/components/star/star-content-async";
import { GridCardsSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default function StarPage() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
        STAR
      </h1>
      <p className="text-sm text-muted-foreground">STAR에 저장한 게시글</p>
      <Suspense fallback={<GridCardsSkeleton count={4} />}>
        <StarContentAsync />
      </Suspense>
    </div>
  );
}
