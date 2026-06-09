import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { mapPostPollRow, postPollSelect, type PostPollView } from "@/lib/post-poll";

const postDetailSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  viewCount: true,
  author: { select: userPublicSelect },
  media: {
    select: { id: true, url: true, type: true },
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
    return attachPollView(post, viewerId);
  } catch (e) {
    console.error("[getPostDetail]", e);
    const post = await db.post.findUnique({ where: { id }, select: postDetailSelectNoReposts });
    if (!post) return null;
    return attachPollView({ ...post, poll: null }, viewerId);
  }
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
