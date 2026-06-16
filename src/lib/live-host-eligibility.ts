import { db } from "@/lib/db";
import {
  canHostLiveBroadcast,
  creatorBadgeFromFollowerCount,
  liveHostRequirementMessage,
  type CreatorFollowerBadgeId,
} from "@/lib/creator-follower-badge";

export type LiveHostEligibility = {
  followerCount: number;
  badge: CreatorFollowerBadgeId | null;
  eligible: boolean;
  message: string | null;
};

export async function fetchLiveHostEligibility(userId: string): Promise<LiveHostEligibility> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { _count: { select: { followers: true } } },
  });
  const followerCount = row?._count.followers ?? 0;
  const badge = creatorBadgeFromFollowerCount(followerCount);
  const eligible = canHostLiveBroadcast(followerCount);
  return {
    followerCount,
    badge,
    eligible,
    message: eligible ? null : liveHostRequirementMessage(followerCount),
  };
}

export async function assertLiveHostEligible(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const eligibility = await fetchLiveHostEligibility(userId);
  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.message ?? "라이브 방송 권한이 없습니다." };
  }
  return { ok: true };
}
