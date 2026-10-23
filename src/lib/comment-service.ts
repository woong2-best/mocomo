import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { isOperatorIdentity } from "@/lib/operator-config";
import { publicQnaCommentAuthor } from "@/lib/anonymous-post";
import type { PostCommentSort } from "@/lib/post-queries";
import {
  blockedIdList,
  countVisibleCommentsForPost,
  getBlockedUserIdSet,
} from "@/lib/user-block";
import {
  RANKED_CANDIDATE_LIMIT,
  RANKED_TOP_COUNT,
  pickRankedTopIds,
  usesFeedCommentRanking,
} from "@/lib/comment-rank";

export const MAX_PINNED_COMMENTS = 3;
export const COMMENT_PAGE_SIZE = 20;
export const COMMENT_REPLY_PAGE_SIZE = 20;
export { RANKED_TOP_COUNT, usesFeedCommentRanking };

const visibleWhere = {
  deletedAt: null,
  hiddenAt: null,
  author: { deletedAt: null },
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
  acceptedAt: string | null;
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
  },
  opts?: { anonymous?: boolean; viewerId?: string | null }
): SerializedCommentAuthor {
  const source = opts?.anonymous ? publicQnaCommentAuthor(author, opts.viewerId) : author;
  return {
    id: source.id,
    name: source.name,
    username: source.username,
    image: opts?.anonymous ? null : source.image,
    supportTierSent: opts?.anonymous ? null : (author.supportTierSent ?? null),
  };
}

const commentSelectBase = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  likeCount: true,
  pinnedAt: true,
  acceptedAt: true,
  authorId: true,
  author: { select: userPublicSelect },
  _count: { select: { replies: true } },
} as const;

function encodeCursor(payload: {
  sort: PostCommentSort;
  createdAt: string;
  id: string;
  likeCount?: number;
  excludeIds?: string[];
}) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(raw: string | null): {
  sort: PostCommentSort;
  createdAt: string;
  id: string;
  likeCount?: number;
  excludeIds?: string[];
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
      excludeIds?: unknown;
    };
    if (
      !parsed?.id ||
      !parsed.createdAt ||
      (parsed.sort !== "newest" &&
        parsed.sort !== "oldest" &&
        parsed.sort !== "popular" &&
        parsed.sort !== "ranked")
    ) {
      return null;
    }
    const excludeIds = Array.isArray(parsed.excludeIds)
      ? parsed.excludeIds.filter(
          (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64
        ).slice(0, 24)
      : undefined;
    return {
      sort: parsed.sort,
      createdAt: parsed.createdAt,
      id: parsed.id,
      likeCount: parsed.likeCount,
      excludeIds,
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
    acceptedAt?: Date | null;
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
  viewerId: string | null,
  anonymous = false,
  blockedAuthors: string[] = [],
  hiddenRepliesByParent: Map<string, number> = new Map()
): Promise<SerializedComment[]> {
  const replyIds = rows.flatMap((r) =>
    (r.replies ?? [])
      .filter((x) => !blockedAuthors.includes(x.authorId))
      .map((x) => x.id)
  );
  const allIds = [...rows.map((r) => r.id), ...replyIds];
  const { likedByMe, likedByAuthor } = await loadLikeFlags(
    allIds,
    viewerId,
    postAuthorId
  );

  return rows
    .filter((c) => !blockedAuthors.includes(c.authorId))
    .map((c) => {
    const visibleReplies = (c.replies ?? []).filter(
      (r) => !blockedAuthors.includes(r.authorId)
    );
    const hiddenReplies = hiddenRepliesByParent.get(c.id) ?? 0;
    const replyCount = Math.max(0, c._count.replies - hiddenReplies);

    return {
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
    acceptedAt:
      c.acceptedAt instanceof Date ? c.acceptedAt.toISOString() : null,
    isEdited: isEdited(c.createdAt, c.updatedAt),
    replyCount,
    author: serializeAuthor(c.author, { anonymous, viewerId }),
    replies: visibleReplies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      likeCount: r.likeCount,
      likedByMe: likedByMe.has(r.id),
      likedByAuthor: likedByAuthor.has(r.id),
      isPostAuthor: r.authorId === postAuthorId,
      isEdited: isEdited(r.createdAt, r.updatedAt),
      author: serializeAuthor(r.author, { anonymous, viewerId }),
    })),
  };
  });
}

type CommentRow = Parameters<typeof mapComments>[0][number];

async function loadRankedSignals(
  rows: CommentRow[],
  postAuthorId: string,
  viewerId: string | null
) {
  const ids = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  const [authorReplies, authorLikes, follows] = await Promise.all([
    ids.length
      ? db.comment.groupBy({
          by: ["parentId"],
          where: {
            parentId: { in: ids },
            authorId: postAuthorId,
            deletedAt: null,
            hiddenAt: null,
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as { parentId: string | null }[]),
    ids.length
      ? db.commentLike.findMany({
          where: { userId: postAuthorId, commentId: { in: ids } },
          select: { commentId: true },
        })
      : Promise.resolve([] as { commentId: string }[]),
    viewerId && authorIds.length
      ? db.follow.findMany({
          where: { followerId: viewerId, followingId: { in: authorIds } },
          select: { followingId: true },
        })
      : Promise.resolve([] as { followingId: string }[]),
  ]);
  const authorReplied = new Set(
    authorReplies.map((r) => r.parentId).filter((id): id is string => !!id)
  );
  const likedByAuthor = new Set(authorLikes.map((l) => l.commentId));
  const followed = new Set(follows.map((f) => f.followingId));
  return { authorReplied, likedByAuthor, followed };
}

async function getRankedCommentsPage(params: {
  postId: string;
  postAuthorId: string;
  sort: PostCommentSort;
  limit: number;
  cursor: ReturnType<typeof decodeCursor>;
  viewerId?: string | null;
  includePinned: boolean;
  anonymous?: boolean;
}) {
  const blockedSet = params.viewerId
    ? await getBlockedUserIdSet(params.viewerId)
    : new Set<string>();
  const blockedAuthors = blockedIdList(blockedSet);
  const authorVisibleWhere =
    blockedAuthors.length > 0
      ? {
          ...visibleWhere,
          authorId: { notIn: blockedAuthors },
        }
      : visibleWhere;

  const replyInclude = {
    take: 3,
    where: { ...authorVisibleWhere },
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

  const selectWithReplies = {
    ...commentSelectBase,
    replies: replyInclude,
  };

  let pinned: Awaited<ReturnType<typeof mapComments>> = [];
  if (params.includePinned) {
    const pinnedRows = await db.comment.findMany({
      where: {
        postId: params.postId,
        parentId: null,
        pinnedAt: { not: null },
        ...authorVisibleWhere,
      },
      orderBy: [{ pinnedAt: "asc" }, { createdAt: "asc" }],
      take: MAX_PINNED_COMMENTS,
      select: selectWithReplies,
    });
    pinned = await mapComments(
      pinnedRows,
      params.postAuthorId,
      params.viewerId ?? null,
      params.anonymous,
      blockedAuthors
    );
  }

  const pinnedIds = pinned.map((p) => p.id);
  const cursorExclude = params.cursor?.excludeIds ?? [];

  let top: Awaited<ReturnType<typeof mapComments>> = [];
  if (!params.cursor) {
    const candidateWhere = {
      postId: params.postId,
      parentId: null,
      pinnedAt: null,
      ...authorVisibleWhere,
      ...(pinnedIds.length ? { id: { notIn: pinnedIds } } : {}),
    };
    const [byLikes, byReplies] = await Promise.all([
      db.comment.findMany({
        where: candidateWhere,
        orderBy: [
          { likeCount: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: RANKED_CANDIDATE_LIMIT,
        select: selectWithReplies,
      }),
      db.comment.findMany({
        where: candidateWhere,
        orderBy: [
          { replies: { _count: "desc" } },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: RANKED_CANDIDATE_LIMIT,
        select: selectWithReplies,
      }),
    ]);
    const byId = new Map<string, CommentRow>();
    for (const row of [...byLikes, ...byReplies]) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    const candidates = [...byId.values()];
    const signals = await loadRankedSignals(
      candidates,
      params.postAuthorId,
      params.viewerId ?? null
    );
    const nowMs = Date.now();
    const topIds = pickRankedTopIds(
      candidates,
      (row) => ({
        likeCount: row.likeCount,
        replyCount: row._count.replies,
        likedByAuthor: signals.likedByAuthor.has(row.id),
        authorReplied: signals.authorReplied.has(row.id),
        followedAuthor: signals.followed.has(row.authorId),
        createdAtMs: row.createdAt.getTime(),
        nowMs,
      }),
      RANKED_TOP_COUNT
    );
    const topRows = topIds
      .map((id) => byId.get(id))
      .filter((row): row is CommentRow => !!row);
    top = await mapComments(
      topRows,
      params.postAuthorId,
      params.viewerId ?? null,
      params.anonymous,
      blockedAuthors
    );
  }

  const excludeIds = [
    ...new Set([...pinnedIds, ...top.map((c) => c.id), ...cursorExclude]),
  ];

  const recentWhere = {
    postId: params.postId,
    parentId: null,
    pinnedAt: null,
    ...authorVisibleWhere,
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
  };

  let cursorWhere: Record<string, unknown> | undefined;
  if (params.cursor && params.cursor.sort === "ranked") {
    const createdAt = new Date(params.cursor.createdAt);
    cursorWhere = {
      OR: [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: params.cursor.id } },
      ],
    };
  }

  const rows = await db.comment.findMany({
    where: cursorWhere ? { AND: [recentWhere, cursorWhere] } : recentWhere,
    take: params.limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: selectWithReplies,
  });

  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;
  const parentIds = pageRows.map((r) => r.id);
  const hiddenRepliesByParent = new Map<string, number>();
  if (blockedAuthors.length && parentIds.length) {
    const grouped = await db.comment.groupBy({
      by: ["parentId"],
      where: {
        parentId: { in: parentIds },
        authorId: { in: blockedAuthors },
        deletedAt: null,
        hiddenAt: null,
      },
      _count: { _all: true },
    });
    for (const row of grouped) {
      if (row.parentId) hiddenRepliesByParent.set(row.parentId, row._count._all);
    }
  }

  const page = await mapComments(
    pageRows,
    params.postAuthorId,
    params.viewerId ?? null,
    params.anonymous,
    blockedAuthors,
    hiddenRepliesByParent
  );

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          sort: "ranked",
          createdAt: last.createdAt.toISOString(),
          id: last.id,
          excludeIds: (params.cursor?.excludeIds?.length
            ? params.cursor.excludeIds
            : top.map((c) => c.id)
          ).slice(0, 24),
        })
      : null;

  const total = await countVisibleCommentsForPost(
    params.postId,
    params.viewerId ?? null,
    blockedSet
  );

  return {
    pinned,
    top,
    comments: page,
    nextCursor,
    total,
    sort: "ranked" as const,
  };
}

export async function getPostCommentsPage(params: {
  postId: string;
  postAuthorId: string;
  sort: PostCommentSort;
  limit?: number;
  cursor?: string | null;
  viewerId?: string | null;
  includePinned?: boolean;
  anonymous?: boolean;
  /** QnA / community threads stay chronological — never ranked or pinned. */
  communityId?: string | null;
}) {
  const feedRanking = usesFeedCommentRanking(params.communityId);
  const sort: PostCommentSort =
    feedRanking ? params.sort : params.sort === "ranked" ? "oldest" : params.sort;

  const limit = Math.min(
    50,
    Math.max(1, params.limit ?? COMMENT_PAGE_SIZE)
  );
  const cursor = decodeCursor(params.cursor ?? null);
  const includePinned =
    feedRanking && params.includePinned !== false && !cursor;

  if (sort === "ranked" && feedRanking) {
    return getRankedCommentsPage({
      ...params,
      sort,
      limit,
      cursor,
      includePinned,
    });
  }
  const blockedSet = params.viewerId
    ? await getBlockedUserIdSet(params.viewerId)
    : new Set<string>();
  const blockedAuthors = blockedIdList(blockedSet);
  const authorVisibleWhere =
    blockedAuthors.length > 0
      ? {
          ...visibleWhere,
          authorId: { notIn: blockedAuthors },
        }
      : visibleWhere;

  const replyInclude = {
    take: 3,
    where: { ...authorVisibleWhere },
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
        ...authorVisibleWhere,
      },
      orderBy: [{ pinnedAt: "asc" }, { createdAt: "asc" }],
      take: MAX_PINNED_COMMENTS,
      select: {
        ...commentSelectBase,
        replies: replyInclude,
      },
    });
    pinned = await mapComments(
      pinnedRows,
      params.postAuthorId,
      params.viewerId ?? null,
      params.anonymous,
      blockedAuthors
    );
  }

  const pinnedIds = pinned.map((p) => p.id);

  const baseWhere = {
    postId: params.postId,
    parentId: null,
    ...(feedRanking ? { pinnedAt: null } : {}),
    ...authorVisibleWhere,
    ...(pinnedIds.length ? { id: { notIn: pinnedIds } } : {}),
  };

  let cursorWhere: Record<string, unknown> | undefined;
  if (cursor && cursor.sort === sort) {
    const createdAt = new Date(cursor.createdAt);
    if (sort === "newest") {
      cursorWhere = {
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: cursor.id } },
        ],
      };
    } else if (sort === "oldest") {
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
    sort === "popular"
      ? ([
          { likeCount: "desc" as const },
          { createdAt: "desc" as const },
          { id: "desc" as const },
        ] as const)
      : sort === "newest"
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
  const parentIds = pageRows.map((r) => r.id);
  const hiddenRepliesByParent = new Map<string, number>();
  if (blockedAuthors.length && parentIds.length) {
    const grouped = await db.comment.groupBy({
      by: ["parentId"],
      where: {
        parentId: { in: parentIds },
        authorId: { in: blockedAuthors },
        deletedAt: null,
        hiddenAt: null,
      },
      _count: { _all: true },
    });
    for (const row of grouped) {
      if (row.parentId) hiddenRepliesByParent.set(row.parentId, row._count._all);
    }
  }

  const page = await mapComments(
    pageRows,
    params.postAuthorId,
    params.viewerId ?? null,
    params.anonymous,
    blockedAuthors,
    hiddenRepliesByParent
  );

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          sort,
          createdAt: last.createdAt.toISOString(),
          id: last.id,
          likeCount: last.likeCount,
        })
      : null;

  const total = await countVisibleCommentsForPost(
    params.postId,
    params.viewerId ?? null,
    blockedSet
  );

  return {
    pinned,
    top: [] as SerializedComment[],
    comments: page,
    nextCursor,
    total,
    sort,
  };
}

export async function getCommentRepliesPage(params: {
  parentId: string;
  postId: string;
  postAuthorId: string;
  cursor?: string | null;
  limit?: number;
  viewerId?: string | null;
  anonymous?: boolean;
}) {
  const limit = Math.min(
    50,
    Math.max(1, params.limit ?? COMMENT_REPLY_PAGE_SIZE)
  );
  const cursor = decodeCursor(params.cursor ?? null);
  const blockedAuthors = params.viewerId
    ? blockedIdList(await getBlockedUserIdSet(params.viewerId))
    : [];
  const authorVisibleWhere =
    blockedAuthors.length > 0
      ? {
          ...visibleWhere,
          authorId: { notIn: blockedAuthors },
        }
      : visibleWhere;

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
      ...authorVisibleWhere,
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
    author: serializeAuthor(r.author, {
      anonymous: params.anonymous,
      viewerId: params.viewerId,
    }),
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
