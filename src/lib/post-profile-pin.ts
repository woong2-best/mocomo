import { db } from "@/lib/db";

/** Clears profile main slot and syncs isPinned when the pinned post is authored by the user. */
export async function clearProfileMainPost(userId: string, postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (post?.authorId === userId) {
    await db.$transaction([
      db.post.updateMany({
        where: { id: postId, authorId: userId, isPinned: true },
        data: { isPinned: false },
      }),
      db.user.update({
        where: { id: userId },
        data: { profileMainPostId: null },
      }),
    ]);
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: { profileMainPostId: null },
  });
}
