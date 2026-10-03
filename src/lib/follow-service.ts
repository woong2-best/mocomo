import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifyFollow, notifyFollowRequest } from "@/lib/notifications";
import { assertUserBlockInteractionAllowed } from "@/lib/user-block";

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

export type FollowIntent = "toggle" | "follow" | "unfollow";

async function createFollowOrRequest(
  actorId: string,
  targetUserId: string,
  postsLocked: boolean,
  resolvedUsername: string,
  listOwnerUsername?: string
): Promise<FollowToggleResult> {
  if (postsLocked) {
    try {
      await db.followRequest.create({
        data: { requesterId: actorId, targetId: targetUserId },
      });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
      if (code === "P2002") {
        return { following: false, requested: true };
      }
      throw e;
    }
    void notifyFollowRequest(targetUserId, actorId);
    await revalidateFollowPaths(resolvedUsername, listOwnerUsername);
    return { following: false, requested: true };
  }

  try {
    await db.follow.create({
      data: { followerId: actorId, followingId: targetUserId },
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
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
  await revalidateFollowPaths(resolvedUsername, listOwnerUsername);

  return { following: true };
}

/** Core follow toggle — usable from Server Actions and mobile REST. */
export async function toggleFollowForUser(
  actorId: string,
  targetUserId: string,
  opts?: {
    targetUsername?: string;
    listOwnerUsername?: string;
    /** follow/unfollow are idempotent. toggle flips, which a double-click can undo. */
    intent?: FollowIntent;
  }
): Promise<FollowToggleResult> {
  if (actorId === targetUserId) return { error: "You cannot follow yourself." };

  const blockErr = await assertUserBlockInteractionAllowed(actorId, targetUserId);
  if (blockErr) return blockErr;

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { username: true, postsLocked: true },
  });
  if (!target) return { error: "User not found." };

  const resolvedUsername = opts?.targetUsername?.trim() || target.username;
  const intent = opts?.intent ?? "toggle";

  if (intent === "unfollow") {
    await Promise.all([
      db.follow.deleteMany({
        where: { followerId: actorId, followingId: targetUserId },
      }),
      db.followRequest.deleteMany({
        where: { requesterId: actorId, targetId: targetUserId },
      }),
    ]);
    void db.followRecommendation
      .deleteMany({ where: { userId: actorId, candidateId: targetUserId } })
      .catch(() => {});
    await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
    return { following: false, requested: false };
  }

  if (intent === "follow") {
    const [existingFollow, existingRequest] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: { followerId: actorId, followingId: targetUserId },
        },
        select: { followerId: true },
      }),
      db.followRequest.findUnique({
        where: {
          requesterId_targetId: { requesterId: actorId, targetId: targetUserId },
        },
        select: { id: true },
      }),
    ]);
    if (existingFollow || existingRequest) {
      void db.followRecommendation
        .deleteMany({ where: { userId: actorId, candidateId: targetUserId } })
        .catch(() => {});
      if (existingFollow) return { following: true };
      return { following: false, requested: true };
    }
    return createFollowOrRequest(
      actorId,
      targetUserId,
      target.postsLocked,
      resolvedUsername,
      opts?.listOwnerUsername
    );
  }

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

  return createFollowOrRequest(
    actorId,
    targetUserId,
    target.postsLocked,
    resolvedUsername,
    opts?.listOwnerUsername
  );
}
