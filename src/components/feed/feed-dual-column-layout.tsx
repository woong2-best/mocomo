"use client";

import { FeedAdCard } from "@/components/feed/feed-ad-card";
import { FeedPostCardInteractive } from "@/components/feed/feed-post-card-interactive";
import type { GridPost } from "@/components/feed/feed-post-card";
import { postHasVisualMedia } from "@/lib/format-feed";

type Ad = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

export type FeedLayoutItem =
  | { type: "post"; data: GridPost & { createdAt: string | Date } }
  | { type: "ad"; data: Ad };

function partitionFeedItems(items: FeedLayoutItem[]) {
  const textItems: FeedLayoutItem[] = [];
  const visualItems: FeedLayoutItem[] = [];
  for (const item of items) {
    if (item.type === "ad") {
      visualItems.push(item);
    } else if (postHasVisualMedia(item.data)) {
      visualItems.push(item);
    } else {
      textItems.push(item);
    }
  }
  return { textItems, visualItems };
}

export function FeedDualColumnLayout({
  items,
  likedIds,
  starredIds,
  repostedIds,
}: {
  items: FeedLayoutItem[];
  likedIds: Set<string>;
  starredIds: Set<string>;
  repostedIds: Set<string>;
}) {
  const { textItems, visualItems } = partitionFeedItems(items);

  function renderItem(item: FeedLayoutItem, keySuffix: string) {
    if (item.type === "ad") {
      return (
        <div key={`ad-${item.data.id}-${keySuffix}`} className="mb-4">
          <FeedAdCard ad={item.data} />
        </div>
      );
    }
    return (
      <FeedPostCardInteractive
        key={`${item.data.id}-${keySuffix}`}
        post={item.data}
        initialLiked={likedIds.has(item.data.id)}
        initialStarred={starredIds.has(item.data.id)}
        initialReposted={repostedIds.has(item.data.id)}
      />
    );
  }

  return (
    <>
      {/* 모바일·태블릿: 단일 열, 시간순 */}
      <div className="mx-auto flex w-full max-w-[470px] flex-col lg:hidden">
        {items.map((item, i) => renderItem(item, `m-${i}`))}
      </div>

      {/* 데스크톱(lg+): 왼쪽 글만 · 오른쪽 사진·영상·광고 */}
      <div className="mx-auto hidden w-full max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_470px] lg:gap-8 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 border-border/50 lg:border-r lg:pr-8">
          {textItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
              글만 있는 게시물이 없습니다.
            </p>
          ) : (
            textItems.map((item, i) => renderItem(item, `t-${i}`))
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          {visualItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
              사진·영상 게시물이 없습니다.
            </p>
          ) : (
            visualItems.map((item, i) => renderItem(item, `v-${i}`))
          )}
        </div>
      </div>
    </>
  );
}
