"use server";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Prisma, type MediaType } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { profileUserCacheTag } from "@/lib/cache-tags";
import {
  attachPostContentAccess,
  getSubscriptionsForViewer,
  isMediaContentLocked,
  type ContentLockReason,
} from "@/lib/content-access";
import {
  isSubscriptionActive,
  monthsSubscribed,
  tierFromSubscriptionMonths,
} from "@/lib/creator-subscription";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  attachProfilePostAuthor,
  profilePostIncludeLight,
  parseProfileMediaKind,
  parseProfileSort,
  profilePostsOrderBy,
  type ProfileTab,
  type ProfileMediaKind,
  type ProfileSort,
} from "@/lib/profile-queries";
import { getUserRelationship, isProfileBlocked } from "@/lib/user-relationship";
import type { UserPublicFields } from "@/lib/user-public-select";

const PAGE_SIZE = 15;
const MEDIA_GRID_PAGE_SIZE = 30;

export type ProfileGridMediaItem = {
  id: string;
  url: string;
  type: string;
  duration: number | null;
  priceKrw: number;
  postId: string;
  isNsfw: boolean;
  hideNsfw: boolean;
  locked: boolean;
  lockReason: ContentLockReason;
  instantPurchasePriceKrw: number;
};

const profileUserSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  level: true,
  createdAt: true,
  supportTierSent: true,
  totalSupportReceived: true,
  supportTierReceived: true,
  countryCode: true,
  birthDate: true,
  creatorSubscriptionPriceKrw: true,
  accountStatus: true,
  suspensionReason: true,
  suspendedAt: true,
  profile: {
    select: {
      bio: true,
      bannerUrl: true,
      favoriteTags: true,
      mainCharacter: true,
      snsLinks: true,
      showBirthdayOnProfile: true,
    },
  },
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
} satisfies Prisma.UserSelect;

type ProfileUserRow = Prisma.UserGetPayload<{ select: typeof profileUserSelect }>;
type ProfilePostRow = Prisma.PostGetPayload<{ include: typeof profilePostIncludeLight }>;

function toProfileAuthor(user: ProfileUserRow): UserPublicFields {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    level: user.level,
    supportTierSent: user.supportTierSent,
  };
}

const getCachedProfileUserByUsername = (username: string) =>
  unstable_cache(
    async () =>
      db.user.findUnique({
        where: { username },
        select: profileUserSelect,
      }),
    ["profile-user-core", username],
    { revalidate: 45, tags: [profileUserCacheTag(username)] }
  )();

async function enrichPostsWithMediaAccess(
  posts: ProfilePostRow[],
  viewerId: string | null,
  author: UserPublicFields
) {
  const withAuthor = attachProfilePostAuthor(posts, author);
  const mediaIds = withAuthor.flatMap((p) => p.media?.map((m) => m.id) ?? []);
  const [purchasedIds, subscriptions] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, [author.id]),
  ]);
  const subscription = subscriptions.get(author.id);
  return withAuthor.map((p) =>
    attachPostContentAccess(p, viewerId, purchasedIds, subscription)
  );
}

function mediaTypesForKind(kind: ProfileMediaKind): MediaType | MediaType[] {
  if (kind === "photo") return "IMAGE";
  if (kind === "video") return "VIDEO";
  return ["IMAGE", "VIDEO"];
}

function postMediaSomeFilter(kind: ProfileMediaKind): Prisma.PostMediaWhereInput {
  const types = mediaTypesForKind(kind);
  if (Array.isArray(types)) return { type: { in: types } };
  return { type: types };
}

function postMediaWhereFilter(kind: ProfileMediaKind): Prisma.PostMediaWhereInput {
  return postMediaSomeFilter(kind);
}

export const getProfileHeader = cache(async function getProfileHeader(username: string) {
  const viewerId = await getAuthUserId();
  const user = await getCachedProfileUserByUsername(username);
  if (!user) return null;

  let isFollowing = false;
  let followsYou = false;
  let relationship = { blockedByViewer: false, blockedViewer: false, mutedByViewer: false };
  if (viewerId && viewerId !== user.id) {
    const [followOut, followIn, rel] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: user.id,
          },
        },
        select: { id: true },
      }),
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: viewerId,
          },
        },
        select: { id: true },
      }),
      getUserRelationship(viewerId, user.id),
    ]);
    isFollowing = !!followOut;
    followsYou = !!followIn;
    relationship = rel;
  }

  return {
    user,
    author: toProfileAuthor(user),
    isSelf: viewerId === user.id,
    isFollowing,
    followsYou,
    relationship,
  };
});

export const getProfilePinnedPost = cache(async function getProfilePinnedPost(
  userId: string,
  viewerId: string | null,
  author: UserPublicFields
) {
  if (viewerId && viewerId !== userId) {
    const relationship = await getUserRelationship(viewerId, userId);
    if (isProfileBlocked(relationship)) return null;
  }

  const post = await db.post.findFirst({
    where: { authorId: userId, isPinned: true },
    include: profilePostIncludeLight,
  });
  if (!post) return null;
  const [enriched] = await enrichPostsWithMediaAccess([post], viewerId, author);
  return enriched;
});

export async function getProfileTimeline(
  userId: string,
  tab: ProfileTab,
  author: UserPublicFields,
  cursor?: string,
  options?: { sort?: ProfileSort; mediaKind?: ProfileMediaKind }
) {
  const viewerId = await getAuthUserId();
  if (viewerId && viewerId !== userId) {
    const relationship = await getUserRelationship(viewerId, userId);
    if (isProfileBlocked(relationship)) {
      return { items: [], nextCursor: null };
    }
  }

  const sort = options?.sort ?? "new";
  const mediaKind = options?.mediaKind ?? "all";
  const mediaSome = postMediaSomeFilter(mediaKind);

  if (tab === "posts") {
    const posts = await db.post.findMany({
      where: { authorId: userId, isPinned: false },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: profilePostsOrderBy(sort),
      include: profilePostIncludeLight,
    });
    const enriched = await enrichPostsWithMediaAccess(posts, viewerId, author);
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
        post: { include: profilePostIncludeLight },
      },
    });
    const posts = comments.map((c) => c.post);
    const enrichedPosts = await enrichPostsWithMediaAccess(posts, viewerId, author);
    const postById = new Map(enrichedPosts.map((p) => [p.id, p]));
    return {
      items: comments.map((c) => ({
        type: "reply" as const,
        comment: c,
        post: postById.get(c.post.id) ?? attachProfilePostAuthor([c.post], author)[0],
      })),
      nextCursor: comments.length === PAGE_SIZE ? comments[comments.length - 1]?.id : null,
    };
  }

  if (tab === "media") {
    const posts = await db.post.findMany({
      where: {
        authorId: userId,
        media: { some: mediaSome },
      },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: profilePostsOrderBy(sort),
      include: profilePostIncludeLight,
    });
    const filtered =
      mediaKind === "all"
        ? posts
        : posts.map((p) => ({
            ...p,
            media: p.media.filter((m) =>
              mediaKind === "photo" ? m.type === "IMAGE" : m.type === "VIDEO"
            ),
          }));
    const enriched = await enrichPostsWithMediaAccess(filtered, viewerId, author);
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
    include: { post: { include: profilePostIncludeLight } },
  });
  const posts = likes.map((l) => l.post);
  const enrichedPosts = await enrichPostsWithMediaAccess(posts, viewerId, author);
  const postById = new Map(enrichedPosts.map((p) => [p.id, p]));
  return {
    items: likes.map((l) => ({
      type: "like" as const,
      post: postById.get(l.post.id) ?? attachProfilePostAuthor([l.post], author)[0],
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

export const getViewerCreatorSubscription = cache(async function getViewerCreatorSubscription(
  creatorId: string
) {
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
});

/** API 무한 스크롤용 — username만으로 author 복원 */
export async function getProfileAuthorByUsername(username: string) {
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      level: true,
      supportTierSent: true,
    },
  });
  return user;
}

export async function getProfileMediaGrid(
  userId: string,
  author: UserPublicFields,
  cursor?: string,
  options?: { sort?: ProfileSort; mediaKind?: ProfileMediaKind }
) {
  const viewerId = await getAuthUserId();
  if (viewerId && viewerId !== userId) {
    const relationship = await getUserRelationship(viewerId, userId);
    if (isProfileBlocked(relationship)) {
      return { items: [], nextCursor: null };
    }
  }

  const sort = options?.sort ?? "new";
  const mediaKind = options?.mediaKind ?? "all";
  const typeWhere = postMediaWhereFilter(mediaKind);

  const rows = await db.postMedia.findMany({
    where: {
      ...typeWhere,
      post: { authorId: userId },
    },
    take: MEDIA_GRID_PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy:
      sort === "popular"
        ? [
            { post: { hotScore: "desc" } },
            { post: { createdAt: "desc" } },
            { order: "asc" },
          ]
        : [{ post: { createdAt: "desc" } }, { order: "asc" }],
    select: {
      id: true,
      url: true,
      type: true,
      duration: true,
      priceKrw: true,
      post: {
        select: {
          id: true,
          isNsfw: true,
          instantPurchasePriceKrw: true,
          visibility: true,
          authorId: true,
        },
      },
    },
  });

  const mediaIds = rows.map((r) => r.id);
  const [purchasedIds, subscriptions, viewer] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, [author.id]),
    viewerId
      ? db.user.findUnique({ where: { id: viewerId }, select: { showNsfw: true } })
      : Promise.resolve(null),
  ]);
  const subscription = subscriptions.get(author.id);
  const viewerShowNsfw = viewer?.showNsfw ?? false;
  const isSelf = viewerId === userId;

  const items: ProfileGridMediaItem[] = rows.map((row) => {
    const access = isMediaContentLocked({
      viewerId,
      authorId: row.post.authorId,
      visibility: row.post.visibility,
      instantPurchasePriceKrw: row.post.instantPurchasePriceKrw ?? 0,
      mediaPriceKrw: row.priceKrw,
      purchased: purchasedIds.has(row.id),
      subscription,
    });

    return {
      id: row.id,
      url: row.url,
      type: row.type,
      duration: row.duration,
      priceKrw: row.priceKrw,
      postId: row.post.id,
      isNsfw: row.post.isNsfw,
      hideNsfw: row.post.isNsfw && !isSelf && !viewerShowNsfw,
      locked: access.locked,
      lockReason: access.lockReason,
      instantPurchasePriceKrw: row.post.instantPurchasePriceKrw ?? 0,
    };
  });

  return {
    items,
    nextCursor: rows.length === MEDIA_GRID_PAGE_SIZE ? rows[rows.length - 1]?.id : null,
  };
}
