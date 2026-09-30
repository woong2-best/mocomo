import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { platformPostWhere } from "@/lib/post-scope";
import { nsfwPostWhere } from "@/lib/nsfw-viewer-access";
import { profilePostIncludeLight } from "@/lib/profile-queries";
import {
  fetchMobileFeedPostsByIds,
  fetchWebFeedPostsByIds,
} from "@/lib/feed-query";
import { getBlockedUserIdSet } from "@/lib/user-block";

const ACTIVITY_PREFIX = "act1.";

export type RepostBy = {
  id: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
};

export type FeedTimelineMode = "for_you" | "latest" | "following";

type ActivityCursor = {
  at: number;
  kind: "post" | "repost";
  id: string;
  score?: number;
};

function encodeCursor(cursor: ActivityCursor, popular: boolean) {
  if (popular) {
    return `${ACTIVITY_PREFIX}h|${cursor.score ?? 0}|${cursor.kind}|${cursor.id}`;
  }
  return `${ACTIVITY_PREFIX}t|${new Date(cursor.at).toISOString()}|${cursor.kind}|${cursor.id}`;
}

function decodeCursor(raw: string | null | undefined): { popular: boolean; cursor: ActivityCursor } | null {
  if (!raw?.startsWith(ACTIVITY_PREFIX)) return null;
  const body = raw.slice(ACTIVITY_PREFIX.length);
  const parts = body.split("|");
  if (parts[0] === "t" && parts.length >= 4) {
    const at = new Date(parts[1] ?? "").getTime();
    const kind = parts[2];
    const id = parts.slice(3).join("|");
    if (!id || (kind !== "post" && kind !== "repost") || Number.isNaN(at)) return null;
    return { popular: false, cursor: { at, kind, id } };
  }
  if (parts[0] === "h" && parts.length >= 4) {
    const score = Number(parts[1]);
    const kind = parts[2];
    const id = parts.slice(3).join("|");
    if (!id || (kind !== "post" && kind !== "repost") || Number.isNaN(score)) return null;
    return { popular: true, cursor: { at: 0, kind, id, score } };
  }
  return null;
}

function repostByFrom(row: {
  id: string;
  createdAt: Date;
  user: RepostBy["user"];
}): RepostBy {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    user: row.user,
  };
}

type Activity<T> = {
  sortAt: number;
  score: number;
  kind: "post" | "repost";
  id: string;
  activityKey: string;
  activityAt: string;
  repostBy: RepostBy | null;
  post: T;
};

function keepAfterCursor<T>(rows: Activity<T>[], cursor: ActivityCursor | null, popular: boolean, oldest: boolean) {
  if (!cursor) return rows;
  return rows.filter((row) => {
    if (popular) {
      const score = row.score;
      const cursorScore = cursor.score ?? 0;
      if (score < cursorScore) return true;
      if (score > cursorScore) return false;
      if (row.kind !== cursor.kind) return row.kind > cursor.kind;
      return row.id < cursor.id;
    }
    if (oldest) {
      if (row.sortAt > cursor.at) return true;
      if (row.sortAt < cursor.at) return false;
    } else {
      if (row.sortAt < cursor.at) return true;
      if (row.sortAt > cursor.at) return false;
    }
    if (row.kind !== cursor.kind) return row.kind > cursor.kind;
    return row.id < cursor.id;
  });
}

type ProfileActivityPost = Prisma.PostGetPayload<{ include: typeof profilePostIncludeLight }>;

export async function loadProfilePostActivities(opts: {
  userId: string;
  cursor?: string | null;
  limit: number;
  sort: "new" | "oldest" | "popular";
  where: Prisma.PostWhereInput;
  /** 재게시된 원본에 적용. 작성자 필터를 넣지 않는다. */
  repostPostWhere?: Prisma.PostWhereInput;
  include: typeof profilePostIncludeLight;
}) {
  const decoded = decodeCursor(opts.cursor);
  const popular = opts.sort === "popular";
  const oldest = opts.sort === "oldest";
  const cursor = decoded && decoded.popular === popular ? decoded.cursor : null;
  const legacyPostCursor = !decoded && opts.cursor ? opts.cursor : null;

  const timeWhere: Prisma.DateTimeFilter | undefined = !popular && cursor
    ? oldest
      ? { gte: new Date(cursor.at) }
      : { lte: new Date(cursor.at) }
    : undefined;

  const postOrder: Prisma.PostOrderByWithRelationInput[] = popular
    ? [{ hotScore: "desc" }, { createdAt: "desc" }]
    : oldest
      ? [{ createdAt: "asc" }]
      : [{ createdAt: "desc" }];

  const postWhere: Prisma.PostWhereInput = {
    ...opts.where,
    ...(legacyPostCursor ? {} : {}),
    ...(timeWhere ? { createdAt: timeWhere } : {}),
    ...(popular && cursor
      ? { hotScore: { lte: cursor.score ?? 0 } }
      : {}),
  };

  const [posts, reposts] = await Promise.all([
    db.post.findMany({
      where: legacyPostCursor
        ? opts.where
        : postWhere,
      take: opts.limit + 8,
      ...(legacyPostCursor ? { skip: 1, cursor: { id: legacyPostCursor } } : {}),
      orderBy: postOrder,
      include: opts.include,
    }),
    legacyPostCursor
      ? Promise.resolve([])
      : db.repost.findMany({
      where: {
            userId: opts.userId,
            ...(timeWhere ? { createdAt: timeWhere } : {}),
            post: {
              ...(opts.repostPostWhere ?? platformPostWhere),
              ...(popular && cursor ? { hotScore: { lte: cursor.score ?? 0 } } : {}),
            },
          },
      take: opts.limit + 8,
      orderBy: popular
        ? { post: { hotScore: "desc" } }
        : oldest
          ? { createdAt: "asc" }
          : { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, username: true, name: true, image: true } },
        post: { include: opts.include },
      },
    }),
  ]);

  const authored: Activity<ProfileActivityPost>[] = posts.map(
    (post) => ({
      sortAt: post.createdAt.getTime(),
      score: post.hotScore ?? 0,
      kind: "post" as const,
      id: post.id,
      activityKey: `post:${post.id}`,
      activityAt: post.createdAt.toISOString(),
      repostBy: null,
      post,
    })
  );

  const reposted: Activity<ProfileActivityPost>[] = reposts
    .filter((row) => row.post)
    .map((row) => {
      const post = row.post;
      return {
        sortAt: row.createdAt.getTime(),
        score: post.hotScore ?? 0,
        kind: "repost" as const,
        id: row.id,
        activityKey: `repost:${row.id}`,
        activityAt: row.createdAt.toISOString(),
        repostBy: repostByFrom(row),
        post,
      };
    });

  let merged = [...authored, ...reposted];
  merged = keepAfterCursor(merged, legacyPostCursor ? null : cursor, popular, oldest);
  merged.sort((a, b) => {
    if (popular) {
      if (b.score !== a.score) return b.score - a.score;
      return b.sortAt - a.sortAt;
    }
    return oldest ? a.sortAt - b.sortAt : b.sortAt - a.sortAt;
  });

  const page = merged.slice(0, opts.limit);
  const last = page[page.length - 1];
  const nextCursor =
    merged.length > opts.limit && last
      ? encodeCursor(
          { at: last.sortAt, kind: last.kind, id: last.id, score: last.score },
          popular
        )
      : null;

  return { rows: page, nextCursor };
}

async function followedActorIds(viewerId: string) {
  const following = await db.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
    take: 500,
  });
  return [viewerId, ...following.map((row) => row.followingId)];
}

/**
 * 팔로우한 사람(본인 포함)의 재게시를 피드 페이지 시간 구간에 끼워 넣는다.
 * 추천(for_you)은 첫 페이지 위에 최근 재게시만 올린다.
 */
export async function withRepostActivities<T extends { id: string; createdAt: Date | string }>(
  posts: T[],
  opts: {
    viewerId: string | null;
    cursor: string | null;
    mode: FeedTimelineMode;
    variant: "web" | "mobile";
    canViewNsfw?: boolean;
  }
): Promise<Array<T & { repostBy: RepostBy | null; activityKey: string; activityAt: string }>> {
  const stamped = posts.map((post) => {
    const createdAt =
      post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt);
    return {
      ...post,
      repostBy: null as RepostBy | null,
      activityKey: `post:${post.id}`,
      activityAt: createdAt,
    };
  });
  if (!opts.viewerId) return stamped;

  const canViewNsfw = opts.canViewNsfw ?? false;
  const blocked = await getBlockedUserIdSet(opts.viewerId);
  const visibleStamped = stamped.filter((post) => {
    const authorId = (post as { author?: { id?: string } }).author?.id;
    return !authorId || !blocked.has(authorId);
  });
  const actorIds = (await followedActorIds(opts.viewerId)).filter((id) => !blocked.has(id));
  if (!actorIds.length) return visibleStamped;

  const times = visibleStamped
    .map((post) => new Date(post.activityAt).getTime())
    .filter((n) => !Number.isNaN(n));
  const oldest = times.length ? new Date(Math.min(...times)) : null;

  let upper: Date | null = null;
  if (opts.cursor && opts.mode !== "for_you") {
    const cursorPost = await db.post.findUnique({
      where: { id: opts.cursor },
      select: { createdAt: true },
    });
    upper = cursorPost?.createdAt ?? null;
  }

  const forYouFirstPage = opts.mode === "for_you" && !opts.cursor;
  if (opts.mode === "for_you" && opts.cursor) return visibleStamped;

  const repostRows = await db.repost.findMany({
    where: {
      userId: { in: actorIds },
      createdAt: forYouFirstPage
        ? { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
        : {
            ...(upper ? { lt: upper } : {}),
            ...(oldest ? { gte: oldest } : {}),
          },
      post: { ...platformPostWhere, ...nsfwPostWhere(canViewNsfw) },
    },
    orderBy: { createdAt: "desc" },
    take: forYouFirstPage ? 12 : 24,
    select: {
      id: true,
      createdAt: true,
      postId: true,
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });
  const filteredRepostRows = repostRows.filter(
    (row) => !blocked.has(row.user.id)
  );
  if (!filteredRepostRows.length) return visibleStamped;

  const missingIds = [
    ...new Set(
      filteredRepostRows
        .map((row) => row.postId)
        .filter((id) => !visibleStamped.some((post) => post.id === id))
    ),
  ];
  const loaded =
    missingIds.length === 0
      ? []
      : opts.variant === "mobile"
        ? await fetchMobileFeedPostsByIds(missingIds, canViewNsfw, blocked)
        : await fetchWebFeedPostsByIds(missingIds, canViewNsfw, blocked);
  const byId = new Map<string, T>();
  for (const post of visibleStamped) byId.set(post.id, post);
  for (const post of loaded) byId.set(post.id, post as unknown as T);

  const repostItems = filteredRepostRows.flatMap((row) => {
    const post = byId.get(row.postId);
    if (!post) return [];
    const authorId = (post as { author?: { id?: string } }).author?.id;
    if (authorId && blocked.has(authorId)) return [];
    return [
      {
        ...post,
        createdAt: post.createdAt,
        repostBy: repostByFrom(row),
        activityKey: `repost:${row.id}`,
        activityAt: row.createdAt.toISOString(),
      },
    ];
  });

  if (forYouFirstPage) {
    return [...repostItems, ...visibleStamped];
  }

  const combined = [
    ...visibleStamped.map((post) => ({ sortAt: new Date(post.activityAt).getTime(), post })),
    ...repostItems.map((post) => ({ sortAt: new Date(post.activityAt).getTime(), post })),
  ];
  combined.sort((a, b) => b.sortAt - a.sortAt);
  return combined.map((row) => row.post);
}
