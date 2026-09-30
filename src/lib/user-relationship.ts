import { cache } from "react";
import { db } from "@/lib/db";
import { loadBidirectionalBlockIds } from "@/lib/user-block";

export type UserRelationshipState = {
  blockedByViewer: boolean;
  blockedViewer: boolean;
  mutedByViewer: boolean;
};

async function fetchUserRelationship(
  viewerId: string,
  targetUserId: string
): Promise<UserRelationshipState> {
  const [blocks, mute] = await Promise.all([
    db.userBlock.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    }),
    db.userMute.findUnique({
      where: {
        muterId_mutedId: { muterId: viewerId, mutedId: targetUserId },
      },
      select: { id: true },
    }),
  ]);

  return {
    blockedByViewer: blocks.some((b) => b.blockerId === viewerId && b.blockedId === targetUserId),
    blockedViewer: blocks.some((b) => b.blockerId === targetUserId && b.blockedId === viewerId),
    mutedByViewer: !!mute,
  };
}

/** 요청당 차단·뮤트 상태 1회만 조회 */
export const getUserRelationship = cache(async function getUserRelationship(
  viewerId: string | null,
  targetUserId: string
): Promise<UserRelationshipState> {
  if (!viewerId || viewerId === targetUserId) {
    return { blockedByViewer: false, blockedViewer: false, mutedByViewer: false };
  }
  return fetchUserRelationship(viewerId, targetUserId);
});

export function isProfileBlocked(relationship: UserRelationshipState) {
  return relationship.blockedByViewer || relationship.blockedViewer;
}

/** 차단 관계(양방향)에 있는 사용자 ID 목록 */
export async function getBlockedUserIds(viewerId: string): Promise<string[]> {
  return loadBidirectionalBlockIds(viewerId);
}
