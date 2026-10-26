"use client";

import { Fragment, type ReactNode } from "react";
import { FeedAdCard } from "@/components/feed/feed-ad-card";
import { FeedPostCardInteractive } from "@/components/feed/feed-post-card-interactive";
import type { GridPost } from "@/components/feed/feed-post-card";
import { MotionInViewIndexed } from "@/components/motion/motion-primitives";
import { cn } from "@/lib/utils";

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

export function FeedDualColumnLayout({
  items,
  likedIds,
  starredIds,
  repostedIds,
  paymentsEnabled = false,
  qnaPreview = false,
  afterFirstPost = null,
}: {
  items: FeedLayoutItem[];
  likedIds: Set<string>;
  starredIds: Set<string>;
  repostedIds: Set<string>;
  paymentsEnabled?: boolean;
  qnaPreview?: boolean;
  afterFirstPost?: ReactNode;
}) {
  function renderItem(item: FeedLayoutItem, keySuffix: string, index: number) {
    const wrap = (node: ReactNode, key: string) => (
      <MotionInViewIndexed key={key} index={index} className="mb-4">
        {node}
      </MotionInViewIndexed>
    );

    if (item.type === "ad") {
      return wrap(
        <FeedAdCard ad={item.data} />,
        `ad-${item.data.id}-${keySuffix}`
      );
    }
    return wrap(
      <FeedPostCardInteractive
        post={item.data}
        initialLiked={likedIds.has(item.data.id)}
        initialStarred={starredIds.has(item.data.id)}
        initialReposted={repostedIds.has(item.data.id)}
        paymentsEnabled={paymentsEnabled}
        qnaPreview={qnaPreview}
      />,
      `${item.data.id}-${keySuffix}`
    );
  }

  const firstPostIndex = items.findIndex((item) => item.type === "post");
  const insertAfterIndex = firstPostIndex >= 0 ? firstPostIndex : 0;

  return (
    <div className={cn("mx-auto flex w-full flex-col")}>
      {items.map((item, i) => {
        const card = renderItem(item, `feed-${i}`, i);
        if (!afterFirstPost || i !== insertAfterIndex) return card;
        return (
          <Fragment key={`feed-with-slot-${i}`}>
            {card}
            {afterFirstPost}
          </Fragment>
        );
      })}
      {afterFirstPost && items.length === 0 ? afterFirstPost : null}
    </div>
  );
}
