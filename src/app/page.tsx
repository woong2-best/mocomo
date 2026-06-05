import { Suspense } from "react";
import { HomeShell } from "@/components/home/home-shell";
import { HomeHighlightsAsync } from "@/components/home/home-highlights-async";
import { HomeFeedAsync } from "@/components/home/home-feed-async";
export const revalidate = 60;

function FeedFallback() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="h-32 rounded-2xl bg-muted" />
      <div className="h-32 rounded-2xl bg-muted" />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl lg:max-w-6xl mx-auto">
      <HomeShell />
      <Suspense
        fallback={
          <div className="mb-6 space-y-2 animate-pulse">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 rounded-xl bg-muted" />
              <div className="h-24 rounded-xl bg-muted" />
            </div>
          </div>
        }
      >
        <HomeHighlightsAsync />
      </Suspense>
      <Suspense fallback={<FeedFallback />}>
        <HomeFeedAsync />
      </Suspense>
    </div>
  );
}
