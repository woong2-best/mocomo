export type ProfileFollowCountSource = {
  displayFollowerCount?: number | null;
  displayFollowingCount?: number | null;
} | null | undefined;

export function resolveProfileFollowCounts(
  profile: ProfileFollowCountSource,
  actual: { followers: number; following: number }
): { followerCount: number; followingCount: number } {
  return {
    followerCount:
      profile?.displayFollowerCount != null ? profile.displayFollowerCount : actual.followers,
    followingCount:
      profile?.displayFollowingCount != null ? profile.displayFollowingCount : actual.following,
  };
}
