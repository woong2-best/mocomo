import type { Metadata } from "next";
import { getCachedSession } from "@/lib/auth";
import { getCachedReelsPage } from "@/lib/reels/query";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { REELS_PAGE_SIZE } from "@/lib/reels/constants";
import { ReelsFeed } from "@/components/reels/reels-feed";

export const metadata: Metadata = {
  title: "Reels · MoCoMo",
  description: "세로 숏폼 영상 피드",
  robots: { index: true, follow: true },
};

type Props = {
  searchParams?: Promise<{ v?: string }>;
};

export default async function ReelsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const startPostId = typeof sp.v === "string" ? sp.v : null;

  const { items, nextCursor } = await getCachedReelsPage(null, REELS_PAGE_SIZE);
  const session = await getCachedSession();
  const postIds = items.map((i) => i.postId);

  const engagement =
    session?.user?.id && postIds.length > 0
      ? await getPostEngagementForUser(session.user.id, postIds)
      : { likedIds: [] as string[], starredIds: [] as string[] };

  const liked = new Set(engagement.likedIds);
  const starred = new Set(engagement.starredIds);

  const hydrated = items.map((item) => ({
    ...item,
    liked: liked.has(item.postId),
    starred: starred.has(item.postId),
  }));

  return (
    <ReelsFeed
      initialItems={hydrated}
      initialCursor={nextCursor}
      startPostId={startPostId}
    />
  );
}
