"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyFollow } from "@/lib/notifications";
import { profileUserCacheTag } from "@/lib/cache-tags";
import { revalidateTag } from "next/cache";

const schema = z.object({
  locked: z.boolean(),
});

export async function updatePostsLocked(data: { locked: boolean }) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" as const };

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" as const };

  const userId = session.user.id;
  const locked = parsed.data.locked;

  const prev = await db.user.findUnique({
    where: { id: userId },
    select: { postsLocked: true, username: true },
  });
  if (!prev) return { error: "User not found" as const };

  await db.user.update({
    where: { id: userId },
    data: { postsLocked: locked },
  });

  // 잠금 해제 시 대기 중인 팔로우 요청을 모두 승인 (트위터와 동일)
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
  revalidatePath("/feed");
  if (prev.username) {
    revalidatePath(`/u/${prev.username}`);
    revalidateTag(profileUserCacheTag(prev.username));
  }

  return { success: true as const, locked };
}
