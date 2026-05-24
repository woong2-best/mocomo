import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { mixFeedWithAds } from "@/lib/feed-mixer";
import { ensurePlatformBootstrap } from "@/lib/platform-bootstrap";
import { FALLBACK_FEED_ADS, type FeedAdData } from "@/lib/default-ads";
import { FeedInfinite } from "@/components/feed/feed-infinite";
import { HomeStaticSection } from "@/components/home/home-static-section";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  type FeedItem = Parameters<typeof FeedInfinite>[0]["initialItems"][number];
  let feedItems: FeedItem[] = [];
  let nextCursor: string | null = null;
  let dbOk = true;

  const session = await auth();
  const isPremium = session?.user?.premiumTier === "PREMIUM";
  const isLoggedIn = !!session?.user;

  try {
    await ensurePlatformBootstrap(db);

    const [posts, feedAds] = await Promise.all([
      db.post.findMany({
        take: 12,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              image: true,
              level: true,
              cosplayerProfile: { select: { stageName: true } },
            },
          },
          anime: { select: { title: true, slug: true } },
          media: true,
          _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
        },
      }),
      isPremium
        ? Promise.resolve([])
        : db.adSlot.findMany({ where: { active: true, isFeedAd: true }, take: 10 }),
    ]);

    const ads: FeedAdData[] =
      feedAds.length > 0 ? feedAds : isPremium ? [] : [...FALLBACK_FEED_ADS];

    const mixed = isPremium
      ? posts.map((data) => ({ type: "post" as const, data }))
      : mixFeedWithAds(posts, ads, 6);

    feedItems = mixed.map((item) =>
      item.type === "post"
        ? ({
            type: "post" as const,
            data: { ...item.data, createdAt: item.data.createdAt.toISOString() },
          } as unknown as FeedItem)
        : ({ type: "ad" as const, data: item.data } as unknown as FeedItem)
    );
    nextCursor = posts.length === 12 ? posts[posts.length - 1]?.id ?? null : null;
  } catch (e) {
    dbOk = false;
    console.error("[home]", e);
  }

  const hasDbPosts = feedItems.some((i) => i.type === "post");

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <HomeStaticSection isLoggedIn={isLoggedIn} />

      {!dbOk && (
        <p className="text-xs text-amber-700 bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 mb-4">
          DB 스키마 동기화 필요 — Supabase SQL Editor에서 scripts/supabase-sync.sql 실행 후 Vercel
          Redeploy
        </p>
      )}

      {hasDbPosts ? (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">커뮤니티 피드</h2>
          <FeedInfinite initialItems={feedItems} initialCursor={nextCursor} />
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
