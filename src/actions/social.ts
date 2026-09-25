"use server";

import { db } from "@/lib/db";
import { getCachedCurrentUser, requireAuthMinimal } from "@/lib/auth";
import { postMediaPreview } from "@/lib/post-media-select";
import { notifyPostLike } from "@/lib/notifications";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { userPublicSelect } from "@/lib/user-public-select";
import { platformPostWhere, qnaEngagementError } from "@/lib/post-scope";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import {
  toggleFollowForUser,
  type FollowToggleResult,
} from "@/lib/follow-service";
import {
  approveFollowRequestForUser,
  listIncomingFollowRequestsForUser,
  rejectFollowRequestForUser,
} from "@/lib/follow-request-service";

export type { FollowToggleResult };

export async function toggleFollow(
  userId: string,
  targetUsername?: string,
  opts?: { listOwnerUsername?: string }
): Promise<FollowToggleResult> {
  const user = await requireAuthMinimal();
  return toggleFollowForUser(user.id, userId, {
    targetUsername,
    listOwnerUsername: opts?.listOwnerUsername,
  });
}

export async function approveFollowRequest(requesterId: string) {
  const user = await requireAuthMinimal();
  return approveFollowRequestForUser(user.id, requesterId);
}

export async function rejectFollowRequest(requesterId: string) {
  const user = await requireAuthMinimal();
  return rejectFollowRequestForUser(user.id, requesterId);
}

export async function getIncomingFollowRequests() {
  const user = await requireAuthMinimal();
  return listIncomingFollowRequestsForUser(user.id);
}

export async function toggleLike(postId: string) {
  const user = await requireAuthMinimal();
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, communityId: true },
  });
  if (!post) return { error: "게시물을 찾을 수 없습니다." };
  const blocked = qnaEngagementError(post.communityId);
  if (blocked) return { error: blocked };
  const existing = await db.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  await db.like.create({ data: { userId: user.id, postId } });
  if (post.authorId !== user.id) {
    void notifyPostLike(postId, post.authorId, user.id);
  }
  return { liked: true };
}

export async function repost(postId: string) {
  const user = await requireAuthMinimal();
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { communityId: true },
  });
  if (!post) return { error: "게시물을 찾을 수 없습니다." };
  const blocked = qnaEngagementError(post.communityId);
  if (blocked) return { error: blocked };
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
    where: user
      ? { ...platformPostWhere, ...authorFilter }
      : platformPostWhere,
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
  const gated = await attachWebPaidMediaPlayback(
    visible.map((p) => ({ ...p, authorId: p.authorId ?? p.author.id })),
    user?.id ?? null
  );
  return {
    posts: gated,
    nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null,
  };
}

export async function getTrending() {
  const posts = await db.post.findMany({
    where: platformPostWhere,
    take: 10,
    orderBy: { hotScore: "desc" },
    include: {
      author: { select: { username: true, image: true, postsLocked: true, id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  return filterPostsByAudienceLock(posts, null);
}
