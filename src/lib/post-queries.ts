import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { mapPostPollRow, postPollSelect, type PostPollView } from "@/lib/post-poll";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  getSubscriptionsForViewer,
  isMediaContentLocked,
  type ContentLockReason,
} from "@/lib/content-access";
import { postCollaboratorsHeaderInclude } from "@/lib/post-collaborator-select";
import { canViewLockedAccountContent } from "@/lib/posts-lock";
import type { ContentVisibility, Prisma } from "@prisma/client";
import { rewritePaidVideoSrc } from "@/lib/paid-media-playback";
import { canViewNsfwResource, type PostNsfwBlocked } from "@/lib/nsfw-viewer-access";

type PostDetailMedia = {
  id: string;
  url: string;
  type: string;
  priceKrw: number;
  locked: boolean;
  lockReason: ContentLockReason;
  instantPurchasePriceKrw: number;
  visibility: ContentVisibility;
  width: number | null;
  height: number | null;
  duration: number | null;
  hlsUrl: string | null;
  posterUrl: string | null;
};

const postDetailSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  isPinned: true,
  isNsfw: true,
  contentRating: true,
  authorId: true,
  visibility: true,
  instantPurchasePriceKrw: true,
  viewCount: true,
  author: { select: userPublicSelect },
  collaborators: postCollaboratorsHeaderInclude,
  media: {
    select: {
      id: true,
      url: true,
      type: true,
      priceKrw: true,
      width: true,
      height: true,
      duration: true,
      hlsUrl: true,
      posterUrl: true,
    },
    orderBy: { order: "asc" as const },
  },
  tags: { select: { tag: { select: { id: true, name: true } } } },
  poll: { select: postPollSelect },
  _count: { select: { likes: true, votes: true, comments: true, reposts: true } },
} satisfies Prisma.PostSelect;

const postDetailSelectNoReposts = {
  ...postDetailSelect,
  _count: { select: { likes: true, votes: true, comments: true } },
} as const;

export type PostDetailLocked = {
  audienceLocked: true;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    supportTierSent: import("@prisma/client").SupportTierLevel;
    postsLocked: boolean;
  };
};

export function isPostDetailAudienceLocked(
  post: Awaited<ReturnType<typeof getPostDetail>>
): post is PostDetailLocked {
  return !!post && "audienceLocked" in post && post.audienceLocked === true;
}

export function isPostDetailNsfwBlocked(
  post: Awaited<ReturnType<typeof getPostDetail>>
): post is PostNsfwBlocked {
  return !!post && "nsfwBlocked" in post && post.nsfwBlocked === true;
}

export async function getPostDetail(id: string, viewerId?: string) {
  try {
    const post = await db.post.findUnique({ where: { id }, select: postDetailSelect });
    if (!post) return null;
    if (
      post.isNsfw &&
      !(await canViewNsfwResource({
        viewerId,
        ownerId: post.authorId,
        isNsfw: true,
      }))
    ) {
      return { nsfwBlocked: true as const } satisfies PostNsfwBlocked;
    }
    const allowed = await canViewLockedAccountContent(
      post.authorId,
      viewerId,
      post.author.postsLocked
    );
    if (!allowed) {
      return { audienceLocked: true as const, author: post.author } satisfies PostDetailLocked;
    }
    return enrichPostDetail(post, viewerId);
  } catch (e) {
    console.error("[getPostDetail]", e);
    const post = await db.post.findUnique({ where: { id }, select: postDetailSelectNoReposts });
    if (!post) return null;
    if (
      post.isNsfw &&
      !(await canViewNsfwResource({
        viewerId,
        ownerId: post.authorId,
        isNsfw: true,
      }))
    ) {
      return { nsfwBlocked: true as const } satisfies PostNsfwBlocked;
    }
    const allowed = await canViewLockedAccountContent(
      post.authorId,
      viewerId,
      post.author.postsLocked
    );
    if (!allowed) {
      return { audienceLocked: true as const, author: post.author } satisfies PostDetailLocked;
    }
    return enrichPostDetail({ ...post, poll: null }, viewerId);
  }
}

async function enrichPostDetail<
  T extends {
    authorId: string;
    visibility: ContentVisibility;
    instantPurchasePriceKrw: number;
    media: {
      id: string;
      url: string;
      type: string;
      priceKrw: number | null;
      width?: number | null;
      height?: number | null;
      duration?: number | null;
      hlsUrl?: string | null;
      posterUrl?: string | null;
    }[];
    poll: Parameters<typeof mapPostPollRow>[0] | null;
  }
>(
  post: T,
  viewerId?: string
): Promise<Omit<T, "poll" | "media"> & { poll: PostPollView | null; media: PostDetailMedia[] }> {
  const withPoll = await attachPollView(post, viewerId);
  const mediaIds = withPoll.media.map((m) => m.id);
  const [purchasedIds, subs] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, [withPoll.authorId]),
  ]);

  const media: PostDetailMedia[] = withPoll.media.map((m) => {
    const { locked, lockReason, priceKrw } = isMediaContentLocked({
      viewerId,
      authorId: withPoll.authorId,
      visibility: withPoll.visibility,
      instantPurchasePriceKrw: withPoll.instantPurchasePriceKrw,
      mediaPriceKrw: m.priceKrw,
      purchased: purchasedIds.has(m.id),
      subscription: subs.get(withPoll.authorId) ?? null,
    });
    const gated = rewritePaidVideoSrc({
      id: m.id,
      url: m.url,
      type: m.type,
      priceKrw,
      locked,
      hlsUrl: m.hlsUrl,
      posterUrl: m.posterUrl,
    });
    return {
      id: m.id,
      url: gated.url,
      type: m.type,
      priceKrw: m.priceKrw ?? 0,
      locked,
      lockReason,
      instantPurchasePriceKrw: priceKrw,
      visibility: withPoll.visibility,
      width: m.width ?? null,
      height: m.height ?? null,
      duration: m.duration ?? null,
      hlsUrl: gated.hlsUrl,
      posterUrl: gated.posterUrl,
    };
  });

  return { ...withPoll, media } as Omit<T, "poll" | "media"> & {
    poll: PostPollView | null;
    media: PostDetailMedia[];
  };
}

async function attachPollView<T extends { poll: Parameters<typeof mapPostPollRow>[0] | null }>(
  post: T,
  viewerId?: string
): Promise<Omit<T, "poll"> & { poll: PostPollView | null }> {
  if (!post.poll) return { ...post, poll: null };
  let myVoteOptionId: string | null = null;
  if (viewerId) {
    const vote = await db.postPollVote.findUnique({
      where: { pollId_userId: { pollId: post.poll.id, userId: viewerId } },
      select: { optionId: true },
    });
    myVoteOptionId = vote?.optionId ?? null;
  }
  return {
    ...post,
    poll: mapPostPollRow(post.poll, myVoteOptionId),
  };
}

export type PostCommentSort = "newest" | "popular" | "oldest";

/** @deprecated Prefer getPostCommentsPage from comment-service for reels/API. */
export async function getPostComments(
  postId: string,
  limit = 40,
  sort: PostCommentSort = "oldest"
) {
  const orderBy =
    sort === "popular"
      ? ([
          { likeCount: "desc" as const },
          { createdAt: "desc" as const },
        ] as const)
      : sort === "newest"
        ? ({ createdAt: "desc" as const })
        : ({ createdAt: "asc" as const });

  return db.comment.findMany({
    where: {
      postId,
      parentId: null,
      deletedAt: null,
      hiddenAt: null,
    },
    take: limit,
    orderBy: orderBy as never,
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      likeCount: true,
      pinnedAt: true,
      author: { select: userPublicSelect },
      _count: { select: { replies: true } },
      replies: {
        take: 10,
        where: { deletedAt: null, hiddenAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          likeCount: true,
          author: { select: userPublicSelect },
        },
      },
    },
  });
}

export async function countPostComments(postId: string) {
  return db.comment.count({
    where: { postId, deletedAt: null, hiddenAt: null },
  });
}
