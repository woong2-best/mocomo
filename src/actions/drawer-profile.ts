"use server";

import { db } from "@/lib/db";

export async function getDrawerProfile(username: string) {
  const user = await db.user.findUnique({
    where: { username },
    select: {
      profile: { select: { bannerUrl: true, bannerVideoUrl: true } },
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!user) return null;
  return {
    bannerUrl: user.profile?.bannerUrl ?? null,
    bannerVideoUrl: user.profile?.bannerVideoUrl ?? null,
    following: user._count.following,
    followers: user._count.followers,
  };
}
