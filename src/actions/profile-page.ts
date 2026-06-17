"use server";

import { cache } from "react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import {
  attachPostContentAccess,
  getSubscriptionsForViewer,
} from "@/lib/content-access";
import {
  isSubscriptionActive,
  monthsSubscribed,
  tierFromSubscriptionMonths,
} from "@/lib/creator-subscription";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  profilePostInclude,
  parseProfileMediaKind,
  parseProfileSort,
  profilePostsOrderBy,
  type ProfileTab,
  type ProfileMediaKind,
  type ProfileSort,
} from "@/lib/profile-queries";
import { getUserRelationship, isProfileBlocked } from "@/lib/user-relationship";

const PAGE_SIZE = 15;

type ProfilePostRow = Prisma.PostGetPayload<{ include: typeof profilePostInclude }>;

async function enrichPostsWithMediaAccess(posts: ProfilePostRow[], viewerId: string | null) {
  const mediaIds = posts.flatMap((p) => p.media?.map((m) => m.id) ?? []);
  const creatorIds = [...new Set(posts.map((p) => p.authorId))];
  const [purchasedIds, subscriptions] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, creatorIds),
  ]);
  return posts.map((p) =>
    attachPostContentAccess(p, viewerId, purchasedIds, subscriptions.get(p.authorId))
  );
}

function mediaTypeFilter(kind: ProfileMediaKind | null) {
  if (kind === "photo") return { type: "IMAGE" as const };
  if (kind === "video") return { type: "VIDEO" as const };
  return undefined;
}

export const getProfileHeader = cache(async function getProfileHeader(username: string) {
  const viewerId = await getAuthUserId();
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
      birthDate: true,
      creatorSubscriptionPriceKrw: true,
      profile: true,
      cosplayerProfile: {
        select: {
          id: true,
          bio: true,
          photos: { take: 4, orderBy: { createdAt: "desc" }, select: { id: true, url: true, character: true } },
          animeLinks: {
            take: 6,
            include: { anime: { select: { title: true, slug: true } } },
          },
        },
      },
      userBadges: { include: { badge: true }, take: 6 },
      _count: { select: { followers: true, following: true, posts: true } },
    },
  });
  if (!user) return null;

  let isFollowing = false;
  let followsYou = false;
  let relationship = { blockedByViewer: false, blockedViewer: false, mutedByViewer: false };
  if (viewerId && viewerId !== user.id) {
    const [a, b, rel] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: user.id,
          },
        },
      }),
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: viewerId,
          },
        },
      }),
      getUserRelationship(viewerId, user.id),
    ]);
    isFollowing = !!a;
    followsYou = !!b;
    relationship = rel;
  }

  return {
    user,
    isSelf: viewerId === user.id,
    isFollowing,
    followsYou,
    relationship,
  };
});

export const getProfilePinnedPost = cache(async function getProfilePinnedPost(
  userId: string,
  viewerId: string | null
) {
  if (viewerId && viewerId !== userId) {
    const relationship = await getUserRelationship(viewerId, userId);
    if (isProfileBlocked(relationship)) return null;
  }

  const post = await db.post.findFirst({
    where: { authorId: userId, isPinned: true },
    include: profilePostInclude,
  });
  if (!post) return null;
  const [enriched] = await enrichPostsWithMediaAccess([post], viewerId);
  return enriched;
});

export async function getProfileTimeline(
  userId: string,
  tab: ProfileTab,
  cursor?: string,
  options?: { sort?: ProfileSort; mediaKind?: ProfileMediaKind | null }
) {
  const viewerId = await getAuthUserId();
  if (viewerId && viewerId !== userId) {
    const relationship = await getUserRelationship(viewerId, userId);
    if (isProfileBlocked(relationship)) {
      return { items: [], nextCursor: null };
    }
  }

  const sort = options?.sort ?? "new";
  const mediaKind = options?.mediaKind ?? null;
  const typeFilter = mediaTypeFilter(mediaKind);

  if (tab === "posts") {
    const posts = await db.post.findMany({
      where: { authorId: userId, isPinned: false },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: profilePostsOrderBy(sort),
      include: profilePostInclude,
    });
    const enriched = await enrichPostsWithMediaAccess(posts, viewerId);
    return {
      items: enriched.map((p) => ({ type: "post" as const, post: p })),
      nextCursor: posts.length === PAGE_SIZE ? posts[posts.length - 1]?.id : null,
    };
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
    const posts = comments.map((c) => c.post);
    const enrichedPosts = await enrichPostsWithMediaAccess(posts, viewerId);
    const postById = new Map(enrichedPosts.map((p) => [p.id, p]));
    return {
      items: comments.map((c) => ({
        type: "reply" as const,
        comment: c,
        post: postById.get(c.post.id) ?? c.post,
      })),
      nextCursor: comments.length === PAGE_SIZE ? comments[comments.length - 1]?.id : null,
    };
  }

  if (tab === "media") {
    const posts = await db.post.findMany({
      where: {
        authorId: userId,
        media: typeFilter ? { some: typeFilter } : { some: {} },
      },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: profilePostsOrderBy(sort),
      include: profilePostInclude,
    });
    const filtered = typeFilter
      ? posts.map((p) => ({
          ...p,
          media: p.media.filter((m) => m.type === typeFilter.type),
        }))
      : posts;
    const enriched = await enrichPostsWithMediaAccess(filtered, viewerId);
    return {
      items: enriched.map((p) => ({ type: "post" as const, post: p })),
      nextCursor: posts.length === PAGE_SIZE ? posts[posts.length - 1]?.id : null,
    };
  }

  const likes = await db.like.findMany({
    where: { userId },
    take: PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: { post: { include: profilePostInclude } },
  });
  const posts = likes.map((l) => l.post);
  const enrichedPosts = await enrichPostsWithMediaAccess(posts, viewerId);
  const postById = new Map(enrichedPosts.map((p) => [p.id, p]));
  return {
    items: likes.map((l) => ({
      type: "like" as const,
      post: postById.get(l.post.id) ?? l.post,
    })),
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

export async function getViewerCreatorSubscription(creatorId: string) {
  const viewerId = await getAuthUserId();
  if (!viewerId || viewerId === creatorId) {
    return { subscribed: false as const, tier: "NONE" as const, months: 0 };
  }

  const sub = await db.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId: viewerId, creatorId } },
    select: { subscribedSince: true, currentPeriodEnd: true, status: true },
  });

  if (!sub || !isSubscriptionActive(sub)) {
    return { subscribed: false as const, tier: "NONE" as const, months: 0 };
  }

  const months = monthsSubscribed(sub.subscribedSince);
  return {
    subscribed: true as const,
    tier: tierFromSubscriptionMonths(months),
    months,
  };
}
