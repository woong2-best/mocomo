import dynamic from "next/dynamic";
import Link from "next/link";
import { getCachedFeedAds, getCachedFeedPosts } from "@/lib/cached-data";
import { mixFeedWithAds } from "@/lib/feed-mixer";
import { getCachedSession } from "@/lib/auth";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { isPaymentsConfigured } from "@/lib/payments";

const HomeFeedClient = dynamic(
  () => import("@/components/home/home-feed-client").then((m) => m.HomeFeedClient)
);

function serializeCreatedAt<T extends { createdAt: Date | string }>(rows: T[]): T[] {
  return rows.map((row) => ({
    ...row,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }));
}

export async function HomeFeedAsync() {
  try {
    const [rawPosts, session, feedAds] = await Promise.all([
      getCachedFeedPosts(),
      getCachedSession(),
      getCachedFeedAds(),
    ]);
    const viewerId = session?.user?.id ?? null;
    const visible = await filterPostsByAudienceLock(
      rawPosts.map((p) => ({ ...p, authorId: p.author.id })),
      viewerId
    );
    const postIds = visible.map((p) => p.id);
    const viewerUserId = session?.user?.id;

    const [posts, engagement] = await Promise.all([
      attachWebPaidMediaPlayback(visible, viewerId),
      viewerUserId && postIds.length > 0
        ? getPostEngagementForUser(viewerUserId, postIds).catch((e) => {
            console.error("[HomeFeedAsync] engagement", e);
            return { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };
          })
        : Promise.resolve({
            likedIds: [] as string[],
            starredIds: [] as string[],
            repostedIds: [] as string[],
          }),
    ]);
    const serialized = serializeCreatedAt(posts);
    const isLoggedIn = !!session?.user;
    const isPremium = session?.user?.premiumTier === "PREMIUM";
    const ads = isPremium ? [] : feedAds;
    const mixed = mixFeedWithAds(serialized, ads);
    const nextCursor = rawPosts.length === 12 ? rawPosts[rawPosts.length - 1]?.id ?? null : null;
    const hasDbPosts = mixed.some((item) => item.type === "post");
    const paymentsEnabled = isPaymentsConfigured();
    const visibleMixed = mixed;

    return (
      <HomeFeedClient
        isLoggedIn={isLoggedIn}
        isPremium={isPremium}
        likedIds={engagement.likedIds}
        starredIds={engagement.starredIds}
        repostedIds={engagement.repostedIds}
        paymentsEnabled={paymentsEnabled}
        feedItems={visibleMixed.map((item) =>
          item.type === "ad"
            ? item
            : {
                type: "post" as const,
                data: {
                  ...item.data,
                  createdAt:
                    item.data.createdAt instanceof Date
                      ? item.data.createdAt.toISOString()
                      : String(item.data.createdAt),
                },
              }
        )}
        nextCursor={nextCursor}
        hasDbPosts={hasDbPosts}
      />
    );
  } catch {
    return (
      <>
        <p className="text-xs text-amber-700 bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 mb-4">
          지금은 피드를 불러올 수 없습니다. 잠시 후 새로고침해 주세요.
        </p>
        <div className="text-center py-12 rounded-2xl border border-dashed">
          <p className="text-muted-foreground mb-4">연결 후 피드가 표시됩니다</p>
          <Link href="/explore" className="text-primary text-sm font-medium hover:underline">
            탐색으로 이동 →
          </Link>
        </div>
      </>
    );
  }
}
