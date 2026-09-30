import { cache } from "react";
import { db } from "@/lib/db";

const BLOCK_LOOKUP_CAP = 500;

export const USER_BLOCK_INTERACTION_ERROR = "차단된 사용자와는 상호작용할 수 없습니다.";

/** 차단 관계(양방향)에 있는 사용자 ID — 요청당 1회 조회 */
export async function loadBidirectionalBlockIds(viewerId: string): Promise<string[]> {
  const rows = await db.userBlock.findMany({
    where: {
      OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
    },
    select: { blockerId: true, blockedId: true },
    take: BLOCK_LOOKUP_CAP,
  });

  const out = new Set<string>();
  for (const row of rows) {
    out.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
  }
  return [...out];
}

export const getBlockedUserIdSet = cache(async (viewerId: string): Promise<Set<string>> => {
  return new Set(await loadBidirectionalBlockIds(viewerId));
});

export async function areUsersBlocked(
  viewerId: string | null | undefined,
  targetUserId: string | null | undefined
): Promise<boolean> {
  if (!viewerId || !targetUserId || viewerId === targetUserId) return false;
  const blocked = await getBlockedUserIdSet(viewerId);
  return blocked.has(targetUserId);
}

export async function assertUserBlockInteractionAllowed(
  viewerId: string,
  targetUserId: string
): Promise<{ error: string } | null> {
  if (viewerId === targetUserId) return null;
  if (await areUsersBlocked(viewerId, targetUserId)) {
    return { error: USER_BLOCK_INTERACTION_ERROR };
  }
  return null;
}

export function blockedIdList(blocked: Set<string>): string[] {
  if (!blocked.size) return [];
  return [...blocked].slice(0, BLOCK_LOOKUP_CAP);
}

export function prismaExcludeBlockedUserIds(
  blocked: Set<string>,
  field: "authorId" | "sellerId" | "userId" | "createdBy" = "authorId"
) {
  const ids = blockedIdList(blocked);
  if (!ids.length) return {};
  return { [field]: { notIn: ids } };
}

export function filterOutBlockedUserIds<T>(
  items: T[],
  blocked: Set<string>,
  getUserId: (item: T) => string
): T[] {
  if (!blocked.size) return items;
  return items.filter((item) => !blocked.has(getUserId(item)));
}

/** @alias loadBidirectionalBlockIds — 명세 호환 이름 */
export const getBidirectionalBlockedUserIds = loadBidirectionalBlockIds;

export const QUOTED_POST_BLOCKED_MESSAGE = "차단된 사용자의 게시물입니다";

export function prismaExcludeBlockedAuthors(blocked: Set<string>) {
  return prismaExcludeBlockedUserIds(blocked, "authorId");
}

const visibleCommentWhere = {
  deletedAt: null,
  hiddenAt: null,
  author: { deletedAt: null },
} as const;

export async function countVisibleCommentsForPost(
  postId: string,
  viewerId: string | null,
  blocked?: Set<string>
): Promise<number> {
  const exclude = blocked ?? (viewerId ? await getBlockedUserIdSet(viewerId) : new Set());
  const notAuthors = blockedIdList(exclude);
  return db.comment.count({
    where: {
      postId,
      ...visibleCommentWhere,
      ...(notAuthors.length ? { authorId: { notIn: notAuthors } } : {}),
    },
  });
}

export async function batchHiddenCommentCounts(
  postIds: string[],
  blocked: Set<string>
): Promise<Map<string, number>> {
  const notAuthors = blockedIdList(blocked);
  if (!notAuthors.length || !postIds.length) return new Map();
  const rows = await db.comment.groupBy({
    by: ["postId"],
    where: {
      postId: { in: postIds },
      authorId: { in: notAuthors },
      deletedAt: null,
      hiddenAt: null,
    },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.postId, r._count._all]));
}

export async function batchHiddenLikeCounts(
  postIds: string[],
  blocked: Set<string>
): Promise<Map<string, number>> {
  const notAuthors = blockedIdList(blocked);
  if (!notAuthors.length || !postIds.length) return new Map();
  const rows = await db.like.groupBy({
    by: ["postId"],
    where: {
      postId: { in: postIds },
      userId: { in: notAuthors },
    },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.postId, r._count._all]));
}

type RepostByLike = { user: { id: string } } | null | undefined;

type BlockPolicyPost = {
  id: string;
  author: { id: string };
  quotedPost?: { author: { id: string } } | null;
  quotedPostBlocked?: boolean;
  _count?: { likes?: number; comments?: number; reposts?: number; votes?: number; media?: number };
  repostBy?: RepostByLike;
};

/** 피드·프로필 — 차단 작성자 제외, 인용 마스킹, 댓글/좋아요 수 보정 */
export async function applyViewerBlockPolicyToPosts<T extends BlockPolicyPost>(
  viewerId: string | null | undefined,
  posts: T[]
): Promise<T[]> {
  if (!viewerId || posts.length === 0) return posts;
  const blocked = await getBlockedUserIdSet(viewerId);
  if (!blocked.size) return posts;

  const filtered = posts.filter((p) => {
    if (blocked.has(p.author.id)) return false;
    if (p.repostBy?.user?.id && blocked.has(p.repostBy.user.id)) return false;
    return true;
  });

  const postIds = filtered.map((p) => p.id);
  const [hiddenComments, hiddenLikes] = await Promise.all([
    batchHiddenCommentCounts(postIds, blocked),
    batchHiddenLikeCounts(postIds, blocked),
  ]);

  return filtered.map((p) => {
    const next = { ...p } as T & { quotedPostBlocked?: boolean };
    if (p.quotedPost?.author?.id && blocked.has(p.quotedPost.author.id)) {
      next.quotedPost = null;
      next.quotedPostBlocked = true;
    }
    if (p._count) {
      const hc = hiddenComments.get(p.id) ?? 0;
      const hl = hiddenLikes.get(p.id) ?? 0;
      next._count = {
        ...p._count,
        ...(typeof p._count.comments === "number"
          ? { comments: Math.max(0, p._count.comments - hc) }
          : {}),
        ...(typeof p._count.likes === "number"
          ? { likes: Math.max(0, p._count.likes - hl) }
          : {}),
      };
    }
    return next;
  });
}

export function filterDmInboxByBlock<
  T extends { type?: string; otherUserId?: string | null }
>(rooms: T[], blocked: Set<string>): T[] {
  if (!blocked.size) return rooms;
  return rooms.filter((room) => {
    if (room.type && room.type !== "DM") return true;
    if (!room.otherUserId) return true;
    return !blocked.has(room.otherUserId);
  });
}
