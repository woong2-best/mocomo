"use server";

import { toggleFollow, type FollowToggleResult } from "@/actions/social";
import { requireAuthMinimal } from "@/lib/auth";
import { db } from "@/lib/db";

export async function followUserAction(
  userId: string,
  username: string,
  opts?: { listOwnerUsername?: string }
): Promise<FollowToggleResult> {
  return toggleFollow(userId, username, opts);
}

export async function getFollowStatusAction(targetUserId: string) {
  const user = await requireAuthMinimal();
  if (user.id === targetUserId) {
    return { following: false as const, requested: false as const, postsLocked: false as const };
  }
  const [follow, request, target] = await Promise.all([
    db.follow.findUnique({
      where: {
        followerId_followingId: { followerId: user.id, followingId: targetUserId },
      },
      select: { followerId: true },
    }),
    db.followRequest.findUnique({
      where: {
        requesterId_targetId: { requesterId: user.id, targetId: targetUserId },
      },
      select: { id: true },
    }),
    db.user.findUnique({
      where: { id: targetUserId },
      select: { postsLocked: true },
    }),
  ]);
  return {
    following: !!follow,
    requested: !!request,
    postsLocked: !!target?.postsLocked,
  };
}

/** @deprecated tipCreatorAction in @/actions/support 사용 */
export async function tipUserAction(receiverId: string, username: string, amount: number, message?: string) {
  const { tipCreatorAction } = await import("@/actions/support");
  return tipCreatorAction(receiverId, username, amount, message);
}
