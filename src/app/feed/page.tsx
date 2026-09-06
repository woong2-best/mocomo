import { Suspense } from "react";
import { HomeShell } from "@/components/home/home-shell";
import { HomeHighlightsAsync } from "@/components/home/home-highlights-async";
import { HomeFeedAsync } from "@/components/home/home-feed-async";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata = {
  title: "MoCoMo",
  description: "커뮤니티 피드 — 오늘의 캔버스, 하이라이트, 게시물",
};

export const revalidate = 30;

function FeedFallback() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="h-32 rounded-2xl bg-muted" />
      <div className="h-32 rounded-2xl bg-muted" />
    </div>
  );
}

export default function FeedPage() {
  return (
    <AppPageChrome maxWidth="6xl" spacing="sm" className="!px-4 lg:!px-6">
      <Suspense
        fallback={
          <div className="mb-6 h-24 animate-pulse rounded-2xl bg-muted" />
        }
      >
        <HomeShell />
      </Suspense>
      <Suspense
        fallback={
          <div className="mb-6 space-y-2 animate-pulse">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 rounded-2xl bg-muted" />
              <div className="h-24 rounded-2xl bg-muted" />
            </div>
          </div>
        }
      >
        <HomeHighlightsAsync />
      </Suspense>
      <Suspense fallback={<FeedFallback />}>
        <HomeFeedAsync />
      </Suspense>
    </AppPageChrome>
  );
}
