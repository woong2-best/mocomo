"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { profilePostInclude, type ProfileTab } from "@/lib/profile-queries";

const PAGE_SIZE = 15;

export async function getProfileHeader(username: string) {
  const session = await auth();
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      level: true,
      createdAt: true,
      totalSupportReceived: true,
      supportTierReceived: true,
      totalSupportSent: true,
      supportTierSent: true,
      locale: true,
      countryCode: true,
      profile: true,
      cosplayerProfile: { select: { id: true, stageName: true, bio: true } },
      userBadges: { include: { badge: true }, take: 6 },
      _count: { select: { followers: true, following: true, posts: true } },
    },
  });
  if (!user) return null;

  let isFollowing = false;
  let followsYou = false;
  if (session?.user?.id && session.user.id !== user.id) {
    const [a, b] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: user.id,
          },
        },
      }),
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: session.user.id,
          },
        },
      }),
    ]);
    isFollowing = !!a;
    followsYou = !!b;
  }

  const pinned = await db.post.findFirst({
    where: { authorId: user.id, isPinned: true },
    include: profilePostInclude,
  });

  return {
    user,
    isSelf: session?.user?.id === user.id,
    isFollowing,
    followsYou,
    pinned,
  };
}

export async function getProfileTimeline(
  userId: string,
  tab: ProfileTab,
  cursor?: string
) {
  if (tab === "posts") {
    const posts = await db.post.findMany({
      where: { authorId: userId, isPinned: false },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: profilePostInclude,
    });
    return { items: posts.map((p) => ({ type: "post" as const, post: p })), nextCursor: posts.length === PAGE_SIZE ? posts[posts.length - 1]?.id : null };
  }

  if (tab === "replies") {
    const comments = await db.comment.findMany({
      where: { authorId: userId, parentId: null },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        post: { include: profilePostInclude },
      },
    });
    return {
      items: comments.map((c) => ({ type: "reply" as const, comment: c, post: c.post })),
      nextCursor: comments.length === PAGE_SIZE ? comments[comments.length - 1]?.id : null,
    };
  }

  if (tab === "media") {
    const posts = await db.post.findMany({
      where: { authorId: userId, media: { some: {} } },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: profilePostInclude,
    });
    return { items: posts.map((p) => ({ type: "post" as const, post: p })), nextCursor: posts.length === PAGE_SIZE ? posts[posts.length - 1]?.id : null };
  }

  const likes = await db.like.findMany({
    where: { userId },
    take: PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: { post: { include: profilePostInclude } },
  });
  return {
    items: likes.map((l) => ({ type: "like" as const, post: l.post })),
    nextCursor: likes.length === PAGE_SIZE ? likes[likes.length - 1]?.id : null,
  };
}

export async function getFollowList(
  username: string,
  type: "followers" | "following",
  cursor?: string
) {
  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true, name: true, image: true },
  });
  if (!user) return null;

  const where =
    type === "followers"
      ? { followingId: user.id }
      : { followerId: user.id };

  const rows = await db.follow.findMany({
    where,
    take: 30,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      follower: {
        select: { id: true, username: true, name: true, image: true, profile: { select: { bio: true } } },
      },
      following: {
        select: { id: true, username: true, name: true, image: true, profile: { select: { bio: true } } },
      },
    },
  });

  const users = rows.map((r) => (type === "followers" ? r.follower : r.following));
  return {
    profileUser: user,
    users,
    nextCursor: rows.length === 30 ? rows[rows.length - 1]?.id : null,
  };
}
