import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { notifyFollow } from "@/lib/notifications";
import { profileUserCacheTag } from "@/lib/cache-tags";

/** Toggle account post lock. Unlocking auto-approves pending follow requests. */
export async function setPostsLockedForUser(
  userId: string,
  locked: boolean
): Promise<{ success: true; locked: boolean } | { error: string }> {
  const prev = await db.user.findUnique({
    where: { id: userId },
    select: { postsLocked: true, username: true },
  });
  if (!prev) return { error: "User not found" };

  await db.user.update({
    where: { id: userId },
    data: { postsLocked: locked },
  });

  if (prev.postsLocked && !locked) {
    const pending = await db.followRequest.findMany({
      where: { targetId: userId },
      select: { id: true, requesterId: true },
    });
    if (pending.length > 0) {
      await db.$transaction([
        db.follow.createMany({
          data: pending.map((r) => ({
            followerId: r.requesterId,
            followingId: userId,
          })),
          skipDuplicates: true,
        }),
        db.followRequest.deleteMany({ where: { targetId: userId } }),
      ]);
      for (const r of pending) {
        void notifyFollow(userId, r.requesterId);
      }
    }
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidatePath("/");
  if (prev.username) {
    revalidatePath(`/u/${prev.username}`);
    revalidateTag(profileUserCacheTag(prev.username));
  }

  return { success: true, locked };
}
