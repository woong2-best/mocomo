import { AccountStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const EXCLUDED_ACCOUNT_STATUSES: AccountStatus[] = [
  AccountStatus.LIMITED,
  AccountStatus.TEMP_SUSPENDED,
  AccountStatus.PERMANENT_SUSPENDED,
  AccountStatus.BANNED,
];

/** 추천에서 제외할 사용자 ID 집합 (팔로우·차단·본인) */
export async function getExcludedUserIds(viewerId: string): Promise<Set<string>> {
  const [following, blocked, blockedBy] = await Promise.all([
    db.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    }),
    db.userBlock.findMany({
      where: { blockerId: viewerId },
      select: { blockedId: true },
    }),
    db.userBlock.findMany({
      where: { blockedId: viewerId },
      select: { blockerId: true },
    }),
  ]);

  const out = new Set<string>([viewerId]);
  for (const r of following) out.add(r.followingId);
  for (const r of blocked) out.add(r.blockedId);
  for (const r of blockedBy) out.add(r.blockerId);
  return out;
}

/** 후보 풀/인기 보충용 — 활성·정상 계정만 */
export function isEligibleCandidateWhere(
  extra?: Prisma.UserWhereInput
): Prisma.UserWhereInput {
  const activeCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const newCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    isBanned: false,
    deletedAt: null,
    scheduledPurgeAt: null,
    accountStatus: { notIn: EXCLUDED_ACCOUNT_STATUSES },
    OR: [{ lastLoginAt: { gte: activeCutoff } }, { createdAt: { gte: newCutoff } }],
    ...extra,
  };
}

/** 후보 ID 목록에서 비활성·정지 계정 제거 */
export async function filterEligibleCandidateIds(
  candidateIds: string[],
  excluded: Set<string>
): Promise<string[]> {
  const ids = candidateIds.filter((id) => !excluded.has(id));
  if (!ids.length) return [];
  const rows = await db.user.findMany({
    where: {
      id: { in: ids },
      ...isEligibleCandidateWhere(),
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
