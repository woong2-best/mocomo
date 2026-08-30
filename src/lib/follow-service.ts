import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifyFollow, notifyFollowRequest } from "@/lib/notifications";

export type FollowToggleResult =
  | { following: true; requested?: false }
  | { following: false; requested: false }
  | { following: false; requested: true }
  | { error: string };

async function revalidateFollowPaths(targetUsername?: string, listOwnerUsername?: string) {
  const paths = new Set<string>();
  if (targetUsername?.trim()) {
    const u = targetUsername.trim();
    paths.add(`/u/${u}`);
    paths.add(`/u/${u}/connections`);
  }
  if (listOwnerUsername?.trim()) {
    paths.add(`/u/${listOwnerUsername.trim()}/connections`);
  }
  paths.add("/settings");
  for (const path of paths) {
    revalidatePath(path);
  }
}

/** Core follow toggle — usable from Server Actions and mobile REST. */
export async function toggleFollowForUser(
  actorId: string,
  targetUserId: string,
  opts?: { targetUsername?: string; listOwnerUsername?: string }
): Promise<FollowToggleResult> {
  if (actorId === targetUserId) return { error: "자기 자신은 팔로우할 수 없습니다." };

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { username: true, postsLocked: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  const resolvedUsername = opts?.targetUsername?.trim() || target.username;

  const deleted = await db.follow.deleteMany({
    where: { followerId: actorId, followingId: targetUserId },
  });

  if (deleted.count > 0) {
    void db.followRecommendation
      .deleteMany({ where: { userId: actorId, candidateId: targetUserId } })
      .catch(() => {});
    await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
    return { following: false, requested: false };
  }

  const cancelledRequest = await db.followRequest.deleteMany({
    where: { requesterId: actorId, targetId: targetUserId },
  });
  if (cancelledRequest.count > 0) {
    await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
    return { following: false, requested: false };
  }

  if (target.postsLocked) {
    try {
      await db.followRequest.create({
        data: { requesterId: actorId, targetId: targetUserId },
      });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
      if (code === "P2002") {
        await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
        return { following: false, requested: true };
      }
      throw e;
    }
    void notifyFollowRequest(targetUserId, actorId);
    await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
    return { following: false, requested: true };
  }

  try {
    await db.follow.create({
      data: { followerId: actorId, followingId: targetUserId },
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
      return { following: true };
    }
    throw e;
  }

  void notifyFollow(targetUserId, actorId);
  const { onFollowFromRecommendation } = await import("@/lib/follow-recommendations");
  void onFollowFromRecommendation(actorId, targetUserId).catch(() => {});
  void import("@/lib/creator-dm-marketing").then(({ sendWelcomeDmOnNewFollow }) =>
    sendWelcomeDmOnNewFollow(targetUserId, actorId).catch(() => {})
  );
  await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);

  return { following: true };
}
