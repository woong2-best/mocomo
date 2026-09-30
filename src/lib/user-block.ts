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
