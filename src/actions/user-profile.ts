"use server";

import { toggleFollow } from "@/actions/social";
import { requireAuthMinimal } from "@/lib/auth";
import { db } from "@/lib/db";

export async function followUserAction(
  userId: string,
  username: string,
  opts?: { listOwnerUsername?: string }
) {
  return toggleFollow(userId, username, opts);
}

export async function getFollowStatusAction(targetUserId: string) {
  const user = await requireAuthMinimal();
  if (user.id === targetUserId) return { following: false as const };
  const row = await db.follow.findUnique({
    where: {
      followerId_followingId: { followerId: user.id, followingId: targetUserId },
    },
    select: { followerId: true },
  });
  return { following: !!row };
}

/** @deprecated tipCreatorAction in @/actions/support 사용 */
export async function tipUserAction(receiverId: string, username: string, amount: number, message?: string) {
  const { tipCreatorAction } = await import("@/actions/support");
  return tipCreatorAction(receiverId, username, amount, message);
}
