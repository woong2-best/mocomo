"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCachedCurrentUser, requireAuthMinimal } from "@/lib/auth";
import { postMediaPreview } from "@/lib/post-media-select";
import {
  notifyFollow,
  notifyFollowRequest,
  notifyFollowRequestAccepted,
  notifyPostLike,
} from "@/lib/notifications";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { userPublicSelect } from "@/lib/user-public-select";

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

export type FollowToggleResult =
  | { following: true; requested?: false }
  | { following: false; requested: false }
  | { following: false; requested: true }
  | { error: string };

export async function toggleFollow(
  userId: string,
  targetUsername?: string,
  opts?: { listOwnerUsername?: string }
): Promise<FollowToggleResult> {
  const user = await requireAuthMinimal();
  if (user.id === userId) return { error: "자기 자신은 팔로우할 수 없습니다." };

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, postsLocked: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  const resolvedUsername = targetUsername?.trim() || target.username;

  // 이미 팔로잉 → 언팔로우
  const deleted = await db.follow.deleteMany({
    where: { followerId: user.id, followingId: userId },
  });

  if (deleted.count > 0) {
    void db.followRecommendation
      .deleteMany({ where: { userId: user.id, candidateId: userId } })
      .catch(() => {});
    await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
    return { following: false, requested: false };
  }

  // 대기 중인 요청 → 취소
  const cancelledRequest = await db.followRequest.deleteMany({
    where: { requesterId: user.id, targetId: userId },
  });
  if (cancelledRequest.count > 0) {
    await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
    return { following: false, requested: false };
  }

  // 잠금 계정 → 팔로우 요청
  if (target.postsLocked) {
    try {
      await db.followRequest.create({
        data: { requesterId: user.id, targetId: userId },
      });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
      if (code === "P2002") {
        await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
        return { following: false, requested: true };
      }
      throw e;
    }
    void notifyFollowRequest(userId, user.id);
    await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
    return { following: false, requested: true };
  }

  try {
    await db.follow.create({
      data: { followerId: user.id, followingId: userId },
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);
      return { following: true };
    }
    throw e;
  }

  void notifyFollow(userId, user.id);
  const { onFollowFromRecommendation } = await import("@/lib/follow-recommendations");
  void onFollowFromRecommendation(user.id, userId).catch(() => {});
  await revalidateFollowPaths(resolvedUsername, opts?.listOwnerUsername);

  return { following: true };
}

export async function approveFollowRequest(requesterId: string) {
  const user = await requireAuthMinimal();
  if (user.id === requesterId) return { error: "Invalid" as const };

  const req = await db.followRequest.findUnique({
    where: {
      requesterId_targetId: { requesterId, targetId: user.id },
    },
    select: { id: true, requester: { select: { username: true } } },
  });
  if (!req) return { error: "요청을 찾을 수 없습니다." as const };

  await db.$transaction(async (tx) => {
    try {
      await tx.follow.create({
        data: { followerId: requesterId, followingId: user.id },
      });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
      if (code !== "P2002") throw e;
    }
    await tx.followRequest.delete({ where: { id: req.id } });
  });

  void notifyFollow(user.id, requesterId);
  void notifyFollowRequestAccepted(requesterId, user.id);

  const me = await db.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  await revalidateFollowPaths(req.requester.username, me?.username);
  return { success: true as const };
}

export async function rejectFollowRequest(requesterId: string) {
  const user = await requireAuthMinimal();
  const deleted = await db.followRequest.deleteMany({
    where: { requesterId, targetId: user.id },
  });
  if (deleted.count === 0) return { error: "요청을 찾을 수 없습니다." as const };

  const me = await db.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  await revalidateFollowPaths(undefined, me?.username);
  revalidatePath("/settings");
  return { success: true as const };
}

export async function getIncomingFollowRequests() {
  const user = await requireAuthMinimal();
  const rows = await db.followRequest.findMany({
    where: { targetId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      requester: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          supportTierSent: true,
          profile: { select: { bio: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    user: {
      id: r.requester.id,
      username: r.requester.username,
      name: r.requester.name,
      image: r.requester.image,
      supportTierSent: r.requester.supportTierSent,
      bio: r.requester.profile?.bio ?? null,
    },
  }));
}

export async function toggleLike(postId: string) {
  const user = await requireAuthMinimal();
  const existing = await db.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  await db.like.create({ data: { userId: user.id, postId } });
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (post && post.authorId !== user.id) {
    void notifyPostLike(postId, post.authorId, user.id);
  }
  return { liked: true };
}

export async function repost(postId: string) {
  const user = await requireAuthMinimal();
  const existing = await db.repost.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) {
    await db.repost.delete({ where: { id: existing.id } });
    return { reposted: false };
  }
  await db.repost.create({ data: { userId: user.id, postId } });
  return { reposted: true };
}

export async function getFeed(cursor?: string, limit = 20) {
  const user = await getCachedCurrentUser().catch(() => null);
  const followingIds = user
    ? (
        await db.follow.findMany({
          where: { followerId: user.id },
          take: 500,
          select: { followingId: true },
        })
      ).map((f) => f.followingId)
    : [];

  const authorFilter =
    followingIds.length > 0
      ? { authorId: { in: [...followingIds, ...(user ? [user.id] : [])] } }
      : {};

  const posts = await db.post.findMany({
    where: user ? authorFilter : {},
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: userPublicSelect },
      community: { select: { name: true, slug: true } },
      media: postMediaPreview,
      _count: { select: { likes: true, comments: true, votes: true, media: true } },
    },
  });

  const visible = await filterPostsByAudienceLock(posts, user?.id ?? null);
  return {
    posts: visible,
    nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null,
  };
}

export async function getTrending() {
  const posts = await db.post.findMany({
    take: 10,
    orderBy: { hotScore: "desc" },
    include: {
      author: { select: { username: true, image: true, postsLocked: true, id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  return filterPostsByAudienceLock(posts, null);
}
