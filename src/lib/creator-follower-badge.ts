/** 팔로워 수 기반 크리에이터 뱃지 */

/** @deprecated 라이브 송출 팔로워 제한 없음 — 하위 호환용 */
export const LIVE_HOST_MIN_FOLLOWERS = 0;
/** @deprecated 라이브 송출 뱃지 제한 없음 — 하위 호환용 */
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

/** 팔로워 수와 무관하게 라이브 방송 가능 */
export function canHostLiveBroadcast(_followerCount: number): boolean {
  return true;
}

export function liveHostRequirementMessage(_followerCount: number): string {
  return "";
}
