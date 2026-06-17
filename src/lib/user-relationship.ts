import { db } from "@/lib/db";

export type UserRelationshipState = {
  blockedByViewer: boolean;
  blockedViewer: boolean;
  mutedByViewer: boolean;
};

export async function getUserRelationship(
  viewerId: string | null,
  targetUserId: string
): Promise<UserRelationshipState> {
  if (!viewerId || viewerId === targetUserId) {
    return { blockedByViewer: false, blockedViewer: false, mutedByViewer: false };
  }

  const [blockOut, blockIn, mute] = await Promise.all([
    db.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId: viewerId, blockedId: targetUserId },
      },
      select: { id: true },
    }),
    db.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId: targetUserId, blockedId: viewerId },
      },
      select: { id: true },
    }),
    db.userMute.findUnique({
      where: {
        muterId_mutedId: { muterId: viewerId, mutedId: targetUserId },
      },
      select: { id: true },
    }),
  ]);

  return {
    blockedByViewer: !!blockOut,
    blockedViewer: !!blockIn,
    mutedByViewer: !!mute,
  };
}

export function isProfileBlocked(relationship: UserRelationshipState) {
  return relationship.blockedByViewer || relationship.blockedViewer;
}

/** 차단 관계(양방향)에 있는 사용자 ID 목록 */
export async function getBlockedUserIds(viewerId: string): Promise<string[]> {
  const [blocked, blockedBy] = await Promise.all([
    db.userBlock.findMany({
      where: { blockerId: viewerId },
      select: { blockedId: true },
    }),
    db.userBlock.findMany({
      where: { blockedId: viewerId },
      select: { blockerId: true },
    }),
  ]);

  return [...new Set([...blocked.map((b) => b.blockedId), ...blockedBy.map((b) => b.blockerId)])];
}
