"use client";

import type { ReactNode } from "react";
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
}: {
  items: FeedLayoutItem[];
  likedIds: Set<string>;
  starredIds: Set<string>;
  repostedIds: Set<string>;
  paymentsEnabled?: boolean;
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
      />,
      `${item.data.id}-${keySuffix}`
    );
  }

  return (
    <div className={cn("mx-auto flex w-full flex-col")}>
      {items.map((item, i) => renderItem(item, `feed-${i}`, i))}
    </div>
  );
}
