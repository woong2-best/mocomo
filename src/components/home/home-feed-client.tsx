"use client";

import { useSession } from "next-auth/react";
import { FeedInfinite } from "@/components/feed/feed-infinite";
import { useLocale } from "@/components/providers/locale-provider";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";

type FeedItem = Parameters<typeof FeedInfinite>[0]["initialItems"][number];

export function HomeFeedClient({
  feedItems,
  nextCursor,
  hasDbPosts,
  likedIds = [],
  starredIds = [],
  repostedIds = [],
}: {
  feedItems: FeedItem[];
  nextCursor: string | null;
  hasDbPosts: boolean;
  likedIds?: string[];
  starredIds?: string[];
  repostedIds?: string[];
}) {
  const { data: session } = useSession();
  const { t } = useLocale();
  const isLoggedIn = !!session?.user;
  const isPremium = session?.user?.premiumTier === "PREMIUM";
  const visibleItems = isPremium ? feedItems.filter((item) => item.type !== "ad") : feedItems;

  if (!hasDbPosts) {
    if (!isLoggedIn) return null;
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed">
        <p className="text-muted-foreground mb-4">첫 게시글을 작성해 보세요</p>
        <ComposeOpenButton className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          글 작성하기
        </ComposeOpenButton>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t("feed.title")}</h2>
      <FeedInfinite
        initialItems={visibleItems}
        initialCursor={nextCursor}
        initialLikedIds={likedIds}
        initialStarredIds={starredIds}
        initialRepostedIds={repostedIds}
      />
    </section>
  );
}
