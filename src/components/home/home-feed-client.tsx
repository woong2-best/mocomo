"use client";

import dynamic from "next/dynamic";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { PageSection } from "@/components/layout/page-section";
import { useLocale } from "@/components/providers/locale-provider";
import { AptMailboxLink } from "@/components/compose/apt-mailbox-link";
import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";

const FeedInfinite = dynamic(
  () => import("@/components/feed/feed-infinite").then((m) => m.FeedInfinite),
  {
    loading: () => (
      <div className="space-y-3 animate-pulse">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
      </div>
    ),
  }
);

export function HomeFeedClient({
  feedItems,
  nextCursor,
  hasDbPosts,
  isLoggedIn,
  isPremium = false,
  likedIds = [],
  starredIds = [],
  repostedIds = [],
}: {
  feedItems: FeedLayoutItem[];
  nextCursor: string | null;
  hasDbPosts: boolean;
  isLoggedIn: boolean;
  isPremium?: boolean;
  likedIds?: string[];
  starredIds?: string[];
  repostedIds?: string[];
}) {
  const { t } = useLocale();
  const visibleItems = isPremium ? feedItems.filter((item) => item.type !== "ad") : feedItems;

  if (!hasDbPosts) {
    if (!isLoggedIn) return null;
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed">
        <p className="text-muted-foreground mb-4">APT 우편함에서 첫 게시글을 올려 보세요</p>
        <AptMailboxLink className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          우편함 만들기
        </AptMailboxLink>
      </div>
    );
  }

  return (
    <>
      <FolkBrushDivider className="mb-5 opacity-40" />
      <PageSection title={t("feed.title")} description="팔로우 · 추천 · 최신">
        <FeedInfinite
          initialItems={visibleItems}
          initialCursor={nextCursor}
          initialLikedIds={likedIds}
          initialStarredIds={starredIds}
          initialRepostedIds={repostedIds}
        />
      </PageSection>
    </>
  );
}
