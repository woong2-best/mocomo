import { Suspense } from "react";
import { Bookmark } from "lucide-react";
import { BookmarksContentAsync } from "@/components/bookmarks/bookmarks-content-async";
import { GridCardsSkeleton } from "@/components/ui/content-skeletons";

export default function BookmarksPage() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bookmark className="h-6 w-6" />
        북마크
      </h1>
      <p className="text-sm text-muted-foreground">저장한 게시글 · 애니 · 코스어</p>
      <Suspense fallback={<GridCardsSkeleton count={4} />}>
        <BookmarksContentAsync />
      </Suspense>
    </div>
  );
}
