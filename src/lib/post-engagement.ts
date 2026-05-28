import { db } from "@/lib/db";

export async function getPostEngagementForUser(userId: string, postIds: string[]) {
  if (postIds.length === 0) {
    return { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };
  }
  const [likes, bookmarks, reposts] = await Promise.all([
    db.like.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    }),
    db.bookmark.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    }),
    db.repost.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    }),
  ]);
  return {
    likedIds: likes.map((l) => l.postId),
    starredIds: bookmarks.map((b) => b.postId),
    repostedIds: reposts.map((r) => r.postId),
  };
}
