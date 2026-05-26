"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCachedCurrentUser, requireAuth } from "@/lib/auth";
import { postMediaPreview } from "@/lib/post-media-select";

export async function toggleFollow(userId: string, targetUsername?: string) {
  const user = await requireAuth();
  if (user.id === userId) return { error: "자기 자신은 팔로우할 수 없습니다." };
  const target =
    targetUsername ??
    (await db.user.findUnique({ where: { id: userId }, select: { username: true } }))?.username;
  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: userId } },
  });
  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
    if (target) revalidatePath(`/u/${target}`);
    return { following: false };
  }
  await db.follow.create({ data: { followerId: user.id, followingId: userId } });
  await db.notification.create({
    data: {
      userId,
      type: "follow",
      title: "새 팔로워",
      body: `${user.username}님이 팔로우했습니다.`,
      link: `/u/${user.username}`,
    },
  });
  if (target) revalidatePath(`/u/${target}`);
  return { following: true };
}

export async function toggleLike(postId: string) {
  const user = await requireAuth();
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
    await db.notification.create({
      data: {
        userId: post.authorId,
        type: "like",
        title: "좋아요",
        body: `${user.username}님이 게시물을 좋아합니다.`,
        link: `/post/${postId}`,
      },
    });
  }
  revalidatePath("/");
  return { liked: true };
}

export async function repost(postId: string) {
  const user = await requireAuth();
  const existing = await db.repost.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) {
    await db.repost.delete({ where: { id: existing.id } });
    return { reposted: false };
  }
  await db.repost.create({ data: { userId: user.id, postId } });
  revalidatePath("/");
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
      author: { select: { id: true, username: true, image: true, level: true, supportTierSent: true } },
      community: { select: { name: true, slug: true } },
      media: postMediaPreview,
      _count: { select: { likes: true, comments: true, votes: true } },
    },
  });

  return { posts, nextCursor: posts.length === limit ? posts[posts.length - 1]?.id : null };
}

export async function getTrending() {
  const posts = await db.post.findMany({
    take: 10,
    orderBy: { hotScore: "desc" },
    include: {
      author: { select: { username: true, image: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  return posts;
}
