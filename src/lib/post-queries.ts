import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";

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
  _count: { select: { likes: true, votes: true, comments: true, reposts: true } },
} as const;

const postDetailSelectNoReposts = {
  ...postDetailSelect,
  _count: { select: { likes: true, votes: true, comments: true } },
} as const;

export async function getPostDetail(id: string) {
  try {
    return await db.post.findUnique({ where: { id }, select: postDetailSelect });
  } catch (e) {
    console.error("[getPostDetail]", e);
    return await db.post.findUnique({ where: { id }, select: postDetailSelectNoReposts });
  }
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
