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
  creatorSubscriptionPriceForUser,
} from "@/lib/creator-subscription";
import { isPaymentsConfigured } from "@/lib/payments";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { getUserWikiContributions } from "@/actions/anime";
import {
  attachProfilePostAuthor,
  profilePostIncludeLight,
  parseProfileMediaKind,
  parseProfileSort,
  parseProfileTab,
  profilePostsOrderBy,
  type ProfileTab,
  type ProfileMediaKind,
  type ProfileSort,
} from "@/lib/profile-queries";
import { profilePostsOwnedOrCollabWhere } from "@/lib/post-collaborator-select";
import { getUserRelationship, isProfileBlocked } from "@/lib/user-relationship";
import { canViewLockedAccountContent } from "@/lib/posts-lock";
import type { UserPublicFields } from "@/lib/user-public-select";
import { nsfwPostWhere, resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

const PAGE_SIZE = 10;
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
  createdAt: true,
  supportTierSent: true,
  totalSupportReceived: true,
  supportTierReceived: true,
  countryCode: true,
  birthDate: true,
  creatorSubscriptionPriceKrw: true,
  postsLocked: true,
  accountStatus: true,
  suspensionReason: true,
  suspendedAt: true,
  profile: {
    select: {
      bio: true,
      bannerUrl: true,
      bannerVideoUrl: true,
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
    supportTierSent: user.supportTierSent,
    postsLocked: user.postsLocked,
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
  profileOwner: UserPublicFields
) {
  const withAuthor = attachProfilePostAuthor(posts, profileOwner);
  const mediaIds = withAuthor.flatMap((p) => p.media?.map((m) => m.id) ?? []);
  const authorIds = [...new Set(withAuthor.map((p) => p.authorId))];
  const [purchasedIds, subscriptions] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, authorIds),
  ]);
  return withAuthor.map((p) =>
    attachPostContentAccess(
      p,
      viewerId,
      purchasedIds,
      subscriptions.get(p.authorId)
    )
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
  let followRequested = false;
  let relationship = { blockedByViewer: false, blockedViewer: false, mutedByViewer: false };
  if (viewerId && viewerId !== user.id) {
    const [followOut, followIn, pendingRequest, rel] = await Promise.all([
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
      user.postsLocked
        ? db.followRequest.findUnique({
            where: {
              requesterId_targetId: {
                requesterId: viewerId,
                targetId: user.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      getUserRelationship(viewerId, user.id),
    ]);
    isFollowing = !!followOut;
    followsYou = !!followIn;
    followRequested = !!pendingRequest;
    relationship = rel;
  }

  const canViewPosts =
    !user.postsLocked ||
    viewerId === user.id ||
    isFollowing;

  let hasPayoutAccount = false;
  if (viewerId === user.id) {
    const payout = await db.user.findUnique({
      where: { id: viewerId },
      select: { bankVerifiedAt: true },
    });
    hasPayoutAccount = !!payout?.bankVerifiedAt;
  }

  return {
    user,
    author: toProfileAuthor(user),
    isSelf: viewerId === user.id,
    isFollowing,
    followsYou,
    followRequested,
    canViewPosts,
    relationship,
    hasPayoutAccount,
  };
});

export type ProfileTabContentMeta = {
  isSelf: boolean;
  paymentsEnabled: boolean;
  subscriptionPriceKrw: number;
  authorId: string;
  subscribed: boolean;
  profileBlocked: boolean;
  blockedEmptyMessage: string;
};

/** 프로필 탭 — layout의 getProfileHeader 와 요청 단위 dedupe */
export const getProfileTabContentMeta = cache(async function getProfileTabContentMeta(
  username: string
): Promise<ProfileTabContentMeta | null> {
  const header = await getProfileHeader(username);
  if (!header) return null;

  const paymentsEnabled = isPaymentsConfigured();
  const subscriptionPriceKrw = creatorSubscriptionPriceForUser(
    header.user.creatorSubscriptionPriceKrw
  );
  const profileBlocked =
    !header.isSelf &&
    (header.relationship.blockedByViewer || header.relationship.blockedViewer);
  const blockedEmptyMessage = header.relationship.blockedByViewer
    ? `@${header.user.username} 님을 차단했습니다. 게시물을 볼 수 없습니다.`
    : `@${header.user.username} 님이 회원님을 차단했습니다.`;

  const viewerSub = header.isSelf
    ? { subscribed: false as const }
    : await getViewerCreatorSubscription(header.user.id);

  return {
    isSelf: header.isSelf,
    paymentsEnabled,
    subscriptionPriceKrw,
    authorId: header.user.id,
    subscribed: "subscribed" in viewerSub ? viewerSub.subscribed : false,
    profileBlocked,
    blockedEmptyMessage,
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

  const allowed = await canViewLockedAccountContent(userId, viewerId, author.postsLocked);
  if (!allowed) return null;

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { profileMainPostId: true },
  });

  if (me?.profileMainPostId) {
    const featured = await db.post.findUnique({
      where: { id: me.profileMainPostId },
      include: profilePostIncludeLight,
    });
    if (featured) {
      const [enriched] = await enrichPostsWithMediaAccess([featured], viewerId, author);
      return enriched;
    }
  }

  const post = await db.post.findFirst({
    where: { ...profilePostsOwnedOrCollabWhere(userId), isPinned: true },
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

  const allowed = await canViewLockedAccountContent(userId, viewerId, author.postsLocked);
  if (!allowed) {
    return { items: [], nextCursor: null, postsLocked: true as const };
  }

  const sort = options?.sort ?? "new";
  const mediaKind = options?.mediaKind ?? "all";
  const mediaSome = postMediaSomeFilter(mediaKind);

  if (tab === "posts") {
    const posts = await db.post.findMany({
      where: { ...profilePostsOwnedOrCollabWhere(userId), isPinned: false },
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
      where: { authorId: userId, parentId: null, post: { communityId: null } },
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
        ...profilePostsOwnedOrCollabWhere(userId),
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
    where: { userId, post: { communityId: null } },
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
      supportTierSent: true,
      postsLocked: true,
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

  const allowed = await canViewLockedAccountContent(userId, viewerId, author.postsLocked);
  if (!allowed) {
    return { items: [], nextCursor: null, postsLocked: true as const };
  }

  const sort = options?.sort ?? "new";
  const mediaKind = options?.mediaKind ?? "all";
  const typeWhere = postMediaWhereFilter(mediaKind);
  const isSelf = viewerId === userId;
  const canViewNsfw = isSelf ? true : await resolveCanViewNsfw(viewerId);

  const rows = await db.postMedia.findMany({
    where: {
      ...typeWhere,
      post: {
        ...profilePostsOwnedOrCollabWhere(userId),
        ...nsfwPostWhere(canViewNsfw),
      },
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
        : sort === "oldest"
          ? [{ post: { createdAt: "asc" } }, { order: "asc" }]
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
  const authorIds = [...new Set(rows.map((r) => r.post.authorId))];
  const [purchasedIds, subscriptions, viewer] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, authorIds),
    viewerId
      ? db.user.findUnique({
          where: { id: viewerId },
          select: { showNsfw: true, birthDate: true, role: true },
        })
      : Promise.resolve(null),
  ]);
  const viewerShowNsfw = viewer?.showNsfw ?? false;

  const items: ProfileGridMediaItem[] = rows.map((row) => {
    const access = isMediaContentLocked({
      viewerId,
      authorId: row.post.authorId,
      visibility: row.post.visibility,
      instantPurchasePriceKrw: row.post.instantPurchasePriceKrw ?? 0,
      mediaPriceKrw: row.priceKrw,
      purchased: purchasedIds.has(row.id),
      subscription: subscriptions.get(row.post.authorId),
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

function profileTabQueryKey(tab: ProfileTab, sort: ProfileSort, kind: ProfileMediaKind) {
  return `${tab}:${sort}:${kind}`;
}

export type ProfileTabInitialPayload =
  | {
      key: string;
      kind: "timeline";
      items: {
        type: "post" | "reply" | "like";
        post: Record<string, unknown> & { id: string; createdAt: string };
        comment?: { id: string; content: string; createdAt: string };
      }[];
      nextCursor: string | null;
      likedIds: string[];
      starredIds: string[];
      repostedIds: string[];
    }
  | {
      key: string;
      kind: "media";
      items: ProfileGridMediaItem[];
      nextCursor: string | null;
    }
  | {
      key: string;
      kind: "wiki";
      data: {
        created: { slug: string; title: string; updatedAt: string }[];
        edited: { id: string; createdAt: string; anime: { slug: string; title: string } }[];
      };
    };

/** SSR 첫 탭 — 클라이언트 fetch 없이 타임라인 즉시 표시 */
export const getProfileTabInitialPayload = cache(async function getProfileTabInitialPayload(
  username: string,
  tabParam?: string,
  sortParam?: string,
  kindParam?: string
): Promise<ProfileTabInitialPayload | null> {
  const header = await getProfileHeader(username);
  if (!header) return null;

  const tab = parseProfileTab(tabParam);
  const effectiveTab = tab === "likes" && !header.isSelf ? "posts" : tab;
  const sort = parseProfileSort(sortParam);
  const mediaKind = parseProfileMediaKind(kindParam);
  const key = profileTabQueryKey(
    effectiveTab,
    sort,
    effectiveTab === "media" ? mediaKind : "all"
  );

  const profileBlocked =
    !header.isSelf &&
    (header.relationship.blockedByViewer || header.relationship.blockedViewer);
  const postsLockedFromViewer = !header.isSelf && !header.canViewPosts;

  if (effectiveTab === "wiki") {
    const { created, edited } = await getUserWikiContributions(header.user.id);
    return {
      key,
      kind: "wiki",
      data: {
        created: created.map((a) => ({
          slug: a.slug,
          title: a.title,
          updatedAt: a.updatedAt.toISOString(),
        })),
        edited: edited.map((r) => ({
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          anime: r.anime,
        })),
      },
    };
  }

  if (profileBlocked || postsLockedFromViewer) {
    if (effectiveTab === "media") {
      return { key, kind: "media", items: [], nextCursor: null };
    }
    return {
      key,
      kind: "timeline",
      items: [],
      nextCursor: null,
      likedIds: [],
      starredIds: [],
      repostedIds: [],
    };
  }

  if (effectiveTab === "media") {
    const mediaGrid = await getProfileMediaGrid(header.user.id, header.author, undefined, {
      sort,
      mediaKind,
    });
    return {
      key,
      kind: "media",
      items: mediaGrid.items,
      nextCursor: mediaGrid.nextCursor,
    };
  }

  const timeline = await getProfileTimeline(
    header.user.id,
    effectiveTab,
    header.author,
    undefined,
    { sort }
  );

  const items = timeline.items.map((item) => {
    if (item.type === "post") {
      return {
        type: "post" as const,
        post: { ...item.post, createdAt: item.post.createdAt.toISOString() },
      };
    }
    if (item.type === "reply") {
      return {
        type: "reply" as const,
        comment: {
          id: item.comment.id,
          content: item.comment.content,
          createdAt: item.comment.createdAt.toISOString(),
        },
        post: { ...item.post, createdAt: item.post.createdAt.toISOString() },
      };
    }
    return {
      type: "like" as const,
      post: { ...item.post, createdAt: item.post.createdAt.toISOString() },
    };
  });

  const viewerId = await getAuthUserId();
  const postIds = [...new Set(items.map((item) => item.post.id))];
  const engagement =
    viewerId && postIds.length > 0
      ? await getPostEngagementForUser(viewerId, postIds)
      : { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };

  return {
    key,
    kind: "timeline",
    items,
    nextCursor: timeline.nextCursor,
    likedIds: engagement.likedIds,
    starredIds: engagement.starredIds,
    repostedIds: engagement.repostedIds,
  };
});
