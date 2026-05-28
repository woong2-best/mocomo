import { db } from "@/lib/db";

export async function getPostEngagementForUser(userId: string, postIds: string[]) {
  if (postIds.length === 0) {
    return { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };
  }
  const [likes, bookmarks] = await Promise.all([
    db.like.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    }),
    db.bookmark.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    }),
  ]);

  let repostedIds: string[] = [];
  try {
    const reposts = await db.repost.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    repostedIds = reposts.map((r) => r.postId);
  } catch (e) {
    console.error("[post-engagement] repost", e);
  }

  return {
    likedIds: likes.map((l) => l.postId),
    starredIds: bookmarks.map((b) => b.postId),
    repostedIds,
  };
}
