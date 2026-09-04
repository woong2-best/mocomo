import { db } from "@/lib/db";
import { computeScheduledPurgeAt } from "@/lib/account-deletion";
import { revokeAllMobileRefreshTokens } from "@/lib/mobile-auth-tokens";

const BATCH_SIZE = 20;

/** scheduledPurgeAt이 지난 탈퇴 계정을 영구 삭제 (관련 데이터 cascade) */
export async function purgeExpiredDeletedAccounts(): Promise<number> {
  const now = new Date();
  const expired = await db.user.findMany({
    where: {
      deletedAt: { not: null },
      scheduledPurgeAt: { lte: now },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  let purged = 0;
  for (const user of expired) {
    try {
      await db.user.delete({ where: { id: user.id } });
      purged += 1;
    } catch (e) {
      console.error("[purgeExpiredDeletedAccounts]", user.id, e);
    }
  }
  return purged;
}

export async function recoverDeletedAccount(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true, scheduledPurgeAt: true },
  });
  if (!user?.deletedAt || !user.scheduledPurgeAt) return false;
  if (new Date() >= user.scheduledPurgeAt) return false;

  const deletionMark = user.deletedAt;
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        scheduledPurgeAt: null,
        deletionReason: null,
      },
    }),
    db.comment.updateMany({
      where: { authorId: userId, deletedAt: deletionMark },
      data: { deletedAt: null },
    }),
  ]);

  return true;
}

export async function markAccountForDeletion(userId: string, reason?: string) {
  const deletedAt = new Date();
  const scheduledPurgeAt = computeScheduledPurgeAt(deletedAt);

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        deletedAt,
        scheduledPurgeAt,
        deletionReason: reason?.trim() || null,
      },
    }),
    db.comment.updateMany({
      where: { authorId: userId, deletedAt: null },
      data: { deletedAt },
    }),
    db.like.deleteMany({ where: { userId } }),
    db.commentLike.deleteMany({ where: { userId } }),
    db.follow.deleteMany({
      where: { OR: [{ followerId: userId }, { followingId: userId }] },
    }),
    db.pushSubscription.deleteMany({ where: { userId } }),
  ]);

  await revokeAllMobileRefreshTokens(userId);

  return { deletedAt, scheduledPurgeAt };
}
