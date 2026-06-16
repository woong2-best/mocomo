/** 팔로워 수 기반 크리에이터 뱃지 — 라이브 송출 등 권한과 연동 */

export const LIVE_HOST_MIN_FOLLOWERS = 1000;
export const LIVE_HOST_MIN_BADGE = "silver" as const;

export type CreatorFollowerBadgeId = "bronze" | "silver" | "gold" | "platinum";

export type CreatorFollowerBadgeDef = {
  id: CreatorFollowerBadgeId;
  label: string;
  labelKo: string;
  minFollowers: number;
  color: string;
};

export const CREATOR_FOLLOWER_BADGES: CreatorFollowerBadgeDef[] = [
  { id: "bronze", label: "Bronze", labelKo: "브론즈", minFollowers: 100, color: "#b45309" },
  { id: "silver", label: "Silver", labelKo: "실버", minFollowers: 1000, color: "#94a3b8" },
  { id: "gold", label: "Gold", labelKo: "골드", minFollowers: 5000, color: "#eab308" },
  { id: "platinum", label: "Platinum", labelKo: "플래티넘", minFollowers: 10000, color: "#22d3ee" },
];

export function creatorBadgeFromFollowerCount(count: number): CreatorFollowerBadgeId | null {
  let badge: CreatorFollowerBadgeId | null = null;
  for (const tier of CREATOR_FOLLOWER_BADGES) {
    if (count >= tier.minFollowers) badge = tier.id;
  }
  return badge;
}

export function getCreatorFollowerBadgeDef(id: CreatorFollowerBadgeId): CreatorFollowerBadgeDef {
  return CREATOR_FOLLOWER_BADGES.find((t) => t.id === id)!;
}

function badgeRank(id: CreatorFollowerBadgeId): number {
  return CREATOR_FOLLOWER_BADGES.findIndex((t) => t.id === id);
}

export function canHostLiveBroadcast(followerCount: number): boolean {
  const badge = creatorBadgeFromFollowerCount(followerCount);
  if (!badge) return false;
  return badgeRank(badge) >= badgeRank(LIVE_HOST_MIN_BADGE);
}

export function liveHostRequirementMessage(followerCount: number): string {
  const need = LIVE_HOST_MIN_FOLLOWERS - followerCount;
  if (need <= 0) {
    return `라이브 방송은 ${LIVE_HOST_MIN_FOLLOWERS.toLocaleString()}명 이상 팔로워(실버 크리에이터)만 이용할 수 있습니다.`;
  }
  return `라이브 방송은 팔로워 ${LIVE_HOST_MIN_FOLLOWERS.toLocaleString()}명 이상(실버 크리에이터)만 이용할 수 있습니다. 현재 ${followerCount.toLocaleString()}명 · ${need.toLocaleString()}명 더 필요`;
}
