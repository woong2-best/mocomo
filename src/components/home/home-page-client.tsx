"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { FeedInfinite } from "@/components/feed/feed-infinite";
import { HomeStaticSection } from "@/components/home/home-static-section";
import { Button } from "@/components/ui/button";

type FeedItem = Parameters<typeof FeedInfinite>[0]["initialItems"][number];

export function HomePageClient({
  feedItems,
  nextCursor,
  dbOk,
  hasDbPosts,
}: {
  feedItems: FeedItem[];
  nextCursor: string | null;
  dbOk: boolean;
  hasDbPosts: boolean;
}) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const isPremium = session?.user?.premiumTier === "PREMIUM";
  const visibleItems = isPremium ? feedItems.filter((item) => item.type !== "ad") : feedItems;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <HomeStaticSection isLoggedIn={isLoggedIn} />

      {!dbOk && (
        <p className="text-xs text-amber-700 bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 mb-4">
          지금은 피드를 불러올 수 없습니다. 잠시 후 새로고침해 주세요.
        </p>
      )}

      {hasDbPosts ? (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">커뮤니티 피드</h2>
          <FeedInfinite initialItems={visibleItems} initialCursor={nextCursor} />
        </section>
      ) : isLoggedIn ? (
        <div className="text-center py-12 rounded-2xl border border-dashed">
          <p className="text-muted-foreground mb-4">첫 게시글을 작성해 보세요</p>
          <Link href="/compose">
            <Button className="rounded-xl">글 작성하기</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
