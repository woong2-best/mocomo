import dynamic from "next/dynamic";
import Link from "next/link";
import { getCachedFeedPosts } from "@/lib/cached-data";
import { getCachedSession } from "@/lib/auth";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";

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
    const [rawPosts, session] = await Promise.all([
      getCachedFeedPosts(),
      getCachedSession(),
    ]);
    const viewerId = session?.user?.id ?? null;
    const visible = await filterPostsByAudienceLock(
      rawPosts.map((p) => ({ ...p, authorId: p.author.id })),
      viewerId
    );
    const posts = await attachWebPaidMediaPlayback(visible, viewerId);
    const serialized = serializeCreatedAt(posts);
    const mixed = serialized.map((data) => ({ type: "post" as const, data }));
    const nextCursor = rawPosts.length === 12 ? rawPosts[rawPosts.length - 1]?.id ?? null : null;
    const hasDbPosts = mixed.some((item) => item.type === "post");
    const isLoggedIn = !!session?.user;
    const isPremium = session?.user?.premiumTier === "PREMIUM";
    const visibleMixed = mixed;
    const postIds = mixed.filter((i) => i.type === "post").map((i) => i.data.id);
    let engagement = { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };
    if (session?.user?.id && postIds.length > 0) {
      try {
        engagement = await getPostEngagementForUser(session.user.id, postIds);
      } catch (e) {
        console.error("[HomeFeedAsync] engagement", e);
      }
    }

    return (
      <HomeFeedClient
        isLoggedIn={isLoggedIn}
        isPremium={isPremium}
        likedIds={engagement.likedIds}
        starredIds={engagement.starredIds}
        repostedIds={engagement.repostedIds}
        feedItems={visibleMixed.map((item) => ({
          type: "post" as const,
          data: {
            ...item.data,
            createdAt:
              item.data.createdAt instanceof Date
                ? item.data.createdAt.toISOString()
                : String(item.data.createdAt),
          },
        }))}
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
