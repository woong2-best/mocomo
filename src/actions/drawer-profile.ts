"use server";

import { db } from "@/lib/db";
import { resolveProfileFollowCounts } from "@/lib/profile-follow-counts";

export async function getDrawerProfile(username: string) {
  const user = await db.user.findUnique({
    where: { username },
    select: {
      profile: {
        select: {
          bannerUrl: true,
          bannerVideoUrl: true,
          displayFollowerCount: true,
          displayFollowingCount: true,
        },
      },
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!user) return null;
  const counts = resolveProfileFollowCounts(user.profile, user._count);
  return {
    bannerUrl: user.profile?.bannerUrl ?? null,
    bannerVideoUrl: user.profile?.bannerVideoUrl ?? null,
    following: counts.followingCount,
    followers: counts.followerCount,
  };
}
