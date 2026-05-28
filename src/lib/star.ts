import { db } from "@/lib/db";

export async function getStarredPostIds(userId: string, postIds: string[]) {
  if (postIds.length === 0) return [] as string[];
  const rows = await db.bookmark.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  return rows.map((r) => r.postId);
}
