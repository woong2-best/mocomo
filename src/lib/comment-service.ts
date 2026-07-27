import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { isOperatorIdentity } from "@/lib/operator-config";
import type { PostCommentSort } from "@/lib/post-queries";

export const MAX_PINNED_COMMENTS = 3;
export const COMMENT_PAGE_SIZE = 20;
export const COMMENT_REPLY_PAGE_SIZE = 20;

const visibleWhere = {
  deletedAt: null,
  hiddenAt: null,
} as const;

export type CommentViewer = {
  id: string;
  username: string;
  role: string;
  email?: string | null;
} | null;

export type SerializedCommentAuthor = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  supportTierSent?: string | null;
};

export type SerializedReply = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByMe: boolean;
  likedByAuthor: boolean;
  isPostAuthor: boolean;
  isEdited: boolean;
  author: SerializedCommentAuthor;
};

export type SerializedComment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByMe: boolean;
  likedByAuthor: boolean;
  isPostAuthor: boolean;
  isPinned: boolean;
  pinnedAt: string | null;
  isEdited: boolean;
  replyCount: number;
  author: SerializedCommentAuthor;
  replies: SerializedReply[];
};

function isEdited(createdAt: Date, updatedAt: Date) {
  return updatedAt.getTime() - createdAt.getTime() > 2000;
}

function serializeAuthor(
  author: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
    supportTierSent?: string | null;
  }
): SerializedCommentAuthor {
  return {
    id: author.id,
    name: author.name,
    username: author.username,
    image: author.image,
    supportTierSent: author.supportTierSent ?? null,
  };
}

const commentSelectBase = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  likeCount: true,
  pinnedAt: true,
  authorId: true,
  author: { select: userPublicSelect },
  _count: { select: { replies: true } },
} as const;

function encodeCursor(payload: {
  sort: PostCommentSort;
  createdAt: string;
  id: string;
  likeCount?: number;
}) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(raw: string | null): {
  sort: PostCommentSort;
  createdAt: string;
  id: string;
  likeCount?: number;
} | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as {
      sort?: PostCommentSort;
      createdAt?: string;
      id?: string;
      likeCount?: number;
    };
    if (
      !parsed?.id ||
      !parsed.createdAt ||
      (parsed.sort !== "newest" &&
        parsed.sort !== "oldest" &&
        parsed.sort !== "popular")
    ) {
      return null;
    }
    return {
      sort: parsed.sort,
      createdAt: parsed.createdAt,
      id: parsed.id,
      likeCount: parsed.likeCount,
    };
  } catch {
    return null;
  }
}

async function loadLikeFlags(
  commentIds: string[],
  viewerId: string | null,
  postAuthorId: string
) {
  const likedByMe = new Set<string>();
  const likedByAuthor = new Set<string>();
  if (commentIds.length === 0) {
    return { likedByMe, likedByAuthor };
  }

  const likes = await db.commentLike.findMany({
    where: {
      commentId: { in: commentIds },
      OR: [
        ...(viewerId ? [{ userId: viewerId }] : []),
        { userId: postAuthorId },
      ],
    },
    select: { commentId: true, userId: true },
  });

  for (const like of likes) {
    if (viewerId && like.userId === viewerId) likedByMe.add(like.commentId);
    if (like.userId === postAuthorId) likedByAuthor.add(like.commentId);
  }
  return { likedByMe, likedByAuthor };
}

async function mapComments(
  rows: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    likeCount: number;
    pinnedAt: Date | null;
    authorId: string;
    author: {
      id: string;
      name: string | null;
      username: string;
      image: string | null;
      supportTierSent?: string | null;
    };
    _count: { replies: number };
    replies?: Array<{
      id: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      likeCount: number;
      authorId: string;
      author: {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
        supportTierSent?: string | null;
      };
    }>;
  }>,
  postAuthorId: string,
  viewerId: string | null
): Promise<SerializedComment[]> {
  const replyIds = rows.flatMap((r) => (r.replies ?? []).map((x) => x.id));
  const allIds = [...rows.map((r) => r.id), ...replyIds];
  const { likedByMe, likedByAuthor } = await loadLikeFlags(
    allIds,
    viewerId,
    postAuthorId
  );

  return rows.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    likeCount: c.likeCount,
    likedByMe: likedByMe.has(c.id),
    likedByAuthor: likedByAuthor.has(c.id),
    isPostAuthor: c.authorId === postAuthorId,
    isPinned: !!c.pinnedAt,
    pinnedAt: c.pinnedAt ? c.pinnedAt.toISOString() : null,
    isEdited: isEdited(c.createdAt, c.updatedAt),
    replyCount: Math.max(c._count.replies, c.replies?.length ?? 0),
    author: serializeAuthor(c.author),
    replies: (c.replies ?? []).map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      likeCount: r.likeCount,
      likedByMe: likedByMe.has(r.id),
      likedByAuthor: likedByAuthor.has(r.id),
      isPostAuthor: r.authorId === postAuthorId,
      isEdited: isEdited(r.createdAt, r.updatedAt),
      author: serializeAuthor(r.author),
    })),
  }));
}

export async function getPostCommentsPage(params: {
  postId: string;
  postAuthorId: string;
  sort: PostCommentSort;
  limit?: number;
  cursor?: string | null;
  viewerId?: string | null;
  includePinned?: boolean;
}) {
  const limit = Math.min(
    50,
    Math.max(1, params.limit ?? COMMENT_PAGE_SIZE)
  );
  const cursor = decodeCursor(params.cursor ?? null);
  const includePinned = params.includePinned !== false && !cursor;

  const replyInclude = {
    take: 3,
    where: { ...visibleWhere },
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      likeCount: true,
      authorId: true,
      author: { select: userPublicSelect },
    },
  };

  let pinned: Awaited<ReturnType<typeof mapComments>> = [];
  if (includePinned) {
    const pinnedRows = await db.comment.findMany({
      where: {
        postId: params.postId,
        parentId: null,
        pinnedAt: { not: null },
        ...visibleWhere,
      },
      orderBy: [{ pinnedAt: "asc" }, { createdAt: "asc" }],
      take: MAX_PINNED_COMMENTS,
      select: {
        ...commentSelectBase,
        replies: replyInclude,
      },
    });
    pinned = await mapComments(pinnedRows, params.postAuthorId, params.viewerId ?? null);
  }

  const pinnedIds = pinned.map((p) => p.id);

  const baseWhere = {
    postId: params.postId,
    parentId: null,
    pinnedAt: null,
    ...visibleWhere,
    ...(pinnedIds.length ? { id: { notIn: pinnedIds } } : {}),
  };

  let cursorWhere: Record<string, unknown> | undefined;
  if (cursor && cursor.sort === params.sort) {
    const createdAt = new Date(cursor.createdAt);
    if (params.sort === "newest") {
      cursorWhere = {
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: cursor.id } },
        ],
      };
    } else if (params.sort === "oldest") {
      cursorWhere = {
        OR: [
          { createdAt: { gt: createdAt } },
          { createdAt, id: { gt: cursor.id } },
        ],
      };
    } else {
      const likeCount = cursor.likeCount ?? 0;
      cursorWhere = {
        OR: [
          { likeCount: { lt: likeCount } },
          {
            likeCount,
            OR: [
              { createdAt: { lt: createdAt } },
              { createdAt, id: { lt: cursor.id } },
            ],
          },
        ],
      };
    }
  }

  const orderBy =
    params.sort === "popular"
      ? ([
          { likeCount: "desc" as const },
          { createdAt: "desc" as const },
          { id: "desc" as const },
        ] as const)
      : params.sort === "newest"
        ? ([{ createdAt: "desc" as const }, { id: "desc" as const }] as const)
        : ([{ createdAt: "asc" as const }, { id: "asc" as const }] as const);

  const rows = await db.comment.findMany({
    where: cursorWhere ? { AND: [baseWhere, cursorWhere] } : baseWhere,
    take: limit + 1,
    orderBy: orderBy as never,
    select: {
      ...commentSelectBase,
      replies: replyInclude,
    },
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const page = await mapComments(
    pageRows,
    params.postAuthorId,
    params.viewerId ?? null
  );

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          sort: params.sort,
          createdAt: last.createdAt.toISOString(),
          id: last.id,
          likeCount: last.likeCount,
        })
      : null;

  const total = await db.comment.count({
    where: { postId: params.postId, ...visibleWhere },
  });

  return {
    pinned,
    comments: page,
    nextCursor,
    total,
    sort: params.sort,
  };
}

export async function getCommentRepliesPage(params: {
  parentId: string;
  postId: string;
  postAuthorId: string;
  cursor?: string | null;
  limit?: number;
  viewerId?: string | null;
}) {
  const limit = Math.min(
    50,
    Math.max(1, params.limit ?? COMMENT_REPLY_PAGE_SIZE)
  );
  const cursor = decodeCursor(params.cursor ?? null);

  const cursorWhere =
    cursor && cursor.sort === "oldest"
      ? {
          OR: [
            { createdAt: { gt: new Date(cursor.createdAt) } },
            {
              createdAt: new Date(cursor.createdAt),
              id: { gt: cursor.id },
            },
          ],
        }
      : undefined;

  const rows = await db.comment.findMany({
    where: {
      parentId: params.parentId,
      postId: params.postId,
      ...visibleWhere,
      ...(cursorWhere ?? {}),
    },
    take: limit + 1,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      likeCount: true,
      authorId: true,
      author: { select: userPublicSelect },
    },
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const { likedByMe, likedByAuthor } = await loadLikeFlags(
    pageRows.map((r) => r.id),
    params.viewerId ?? null,
    params.postAuthorId
  );

  const replies: SerializedReply[] = pageRows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    likeCount: r.likeCount,
    likedByMe: likedByMe.has(r.id),
    likedByAuthor: likedByAuthor.has(r.id),
    isPostAuthor: r.authorId === params.postAuthorId,
    isEdited: isEdited(r.createdAt, r.updatedAt),
    author: serializeAuthor(r.author),
  }));

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          sort: "oldest",
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        })
      : null;

  return { replies, nextCursor };
}

export function canModerateComments(
  viewer: CommentViewer,
  postAuthorId: string
) {
  if (!viewer) return false;
  if (viewer.id === postAuthorId) return true;
  return isOperatorIdentity({
    username: viewer.username,
    role: viewer.role,
    email: viewer.email,
  });
}

export function isCommentAdmin(viewer: CommentViewer) {
  if (!viewer) return false;
  return isOperatorIdentity({
    username: viewer.username,
    role: viewer.role,
    email: viewer.email,
  });
}

export function canEditComment(
  viewer: CommentViewer,
  commentAuthorId: string
) {
  return !!viewer && viewer.id === commentAuthorId;
}

export function canDeleteComment(
  viewer: CommentViewer,
  commentAuthorId: string,
  postAuthorId: string
) {
  if (!viewer) return false;
  if (viewer.id === commentAuthorId) return true;
  return canModerateComments(viewer, postAuthorId);
}

export function canPinComment(viewer: CommentViewer, postAuthorId: string) {
  return canModerateComments(viewer, postAuthorId);
}
