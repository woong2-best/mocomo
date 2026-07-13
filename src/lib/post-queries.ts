import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { mapPostPollRow, postPollSelect, type PostPollView } from "@/lib/post-poll";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  getSubscriptionsForViewer,
  isMediaContentLocked,
  type ContentLockReason,
} from "@/lib/content-access";
import type { ContentVisibility } from "@prisma/client";

type PostDetailMedia = {
  id: string;
  url: string;
  type: string;
  priceKrw: number;
  locked: boolean;
  lockReason: ContentLockReason;
  instantPurchasePriceKrw: number;
  visibility: ContentVisibility;
};

const postDetailSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  isPinned: true,
  authorId: true,
  visibility: true,
  instantPurchasePriceKrw: true,
  viewCount: true,
  author: { select: userPublicSelect },
  media: {
    select: { id: true, url: true, type: true, priceKrw: true },
    orderBy: { order: "asc" as const },
  },
  tags: { select: { tag: { select: { id: true, name: true } } } },
  poll: { select: postPollSelect },
  _count: { select: { likes: true, votes: true, comments: true, reposts: true } },
} as const;

const postDetailSelectNoReposts = {
  ...postDetailSelect,
  _count: { select: { likes: true, votes: true, comments: true } },
} as const;

export async function getPostDetail(id: string, viewerId?: string) {
  try {
    const post = await db.post.findUnique({ where: { id }, select: postDetailSelect });
    if (!post) return null;
    return enrichPostDetail(post, viewerId);
  } catch (e) {
    console.error("[getPostDetail]", e);
    const post = await db.post.findUnique({ where: { id }, select: postDetailSelectNoReposts });
    if (!post) return null;
    return enrichPostDetail({ ...post, poll: null }, viewerId);
  }
}

async function enrichPostDetail<
  T extends {
    authorId: string;
    visibility: ContentVisibility;
    instantPurchasePriceKrw: number;
    media: { id: string; url: string; type: string; priceKrw: number | null }[];
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
    return {
      id: m.id,
      url: m.url,
      type: m.type,
      priceKrw: m.priceKrw ?? 0,
      locked,
      lockReason,
      instantPurchasePriceKrw: priceKrw,
      visibility: withPoll.visibility,
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

export async function getPostComments(postId: string, limit = 40) {
  return db.comment.findMany({
    where: { postId, parentId: null },
    take: limit,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: userPublicSelect },
      replies: {
        take: 10,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          author: { select: userPublicSelect },
        },
      },
    },
  });
}
