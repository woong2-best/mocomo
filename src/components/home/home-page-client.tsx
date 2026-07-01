"use client";

import { useSession } from "next-auth/react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";
import { FeedInfinite } from "@/components/feed/feed-infinite";
import { HomeStaticSection } from "@/components/home/home-static-section";
import { WeeklyHighlightsSection } from "@/components/home/weekly-highlights-section";
import type { WeeklyHighlightPost } from "@/lib/weekly-highlights";
import { useLocale } from "@/components/providers/locale-provider";

type FeedItem = Parameters<typeof FeedInfinite>[0]["initialItems"][number];

export function HomePageClient({
  feedItems,
  nextCursor,
  dbOk,
  hasDbPosts,
  topLiked = [],
  topViewed = [],
}: {
  feedItems: FeedItem[];
  nextCursor: string | null;
  dbOk: boolean;
  hasDbPosts: boolean;
  topLiked?: WeeklyHighlightPost[];
  topViewed?: WeeklyHighlightPost[];
}) {
  const { data: session } = useSession();
  const { t } = useLocale();
  const isLoggedIn = !!session?.user;
  const isPremium = session?.user?.premiumTier === "PREMIUM";
  const visibleItems = isPremium ? feedItems.filter((item) => item.type !== "ad") : feedItems;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <HomeStaticSection isLoggedIn={isLoggedIn} />

      {dbOk && (topLiked.length > 0 || topViewed.length > 0) && (
        <WeeklyHighlightsSection topLiked={topLiked} topViewed={topViewed} />
      )}

      {!dbOk && (
        <p className="text-xs text-amber-700 bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 mb-4">
          지금은 피드를 불러올 수 없습니다. 잠시 후 새로고침해 주세요.
        </p>
      )}

      {hasDbPosts ? (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t("feed.title")}</h2>
          <FeedInfinite initialItems={visibleItems} initialCursor={nextCursor} />
        </section>
      ) : isLoggedIn ? (
        <div className="text-center py-12 rounded-2xl border border-dashed">
          <p className="text-muted-foreground mb-4">오늘의 캔버스에 첫 글을 올려 보세요</p>
          <ComposeOpenButton className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            글쓰기
          </ComposeOpenButton>
        </div>
      ) : null}
    </div>
  );
}
