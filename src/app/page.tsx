import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { mixFeedWithAds } from "@/lib/feed-mixer";import { FeedInfinite } from "@/components/feed/feed-infinite";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  type FeedItem = Parameters<typeof FeedInfinite>[0]["initialItems"][number];
  let initialItems: FeedItem[] = [];
  let nextCursor: string | null = null;

  const session = await auth();
  const isPremium = session?.user?.premiumTier === "PREMIUM";

  try {
    const [posts, feedAds] = await Promise.all([      db.post.findMany({
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
      db.adSlot.findMany({
        where: { active: true, isFeedAd: true },
        take: isPremium ? 0 : 10,
      }),
    ]);

    const mixed = isPremium ? posts.map((data) => ({ type: "post" as const, data })) : mixFeedWithAds(posts, feedAds, 6);    initialItems = mixed.map((item) =>
      item.type === "post"
        ? ({
            type: "post" as const,
            data: { ...item.data, createdAt: item.data.createdAt.toISOString() },
          } as unknown as FeedItem)
        : ({ type: "ad" as const, data: item.data } as unknown as FeedItem)
    );
    nextCursor = posts.length === 12 ? posts[posts.length - 1]?.id ?? null : null;
  } catch {
    initialItems = [];
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {initialItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground mb-6">아직 게시글이 없어요</p>
          <Link href="/compose">
            <Button>글 작성하기</Button>
          </Link>
        </div>
      ) : (
        <FeedInfinite initialItems={initialItems} initialCursor={nextCursor} />
      )}
    </div>
  );
}
