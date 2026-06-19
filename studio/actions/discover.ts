"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function listStudioCreators(take = 24) {
  return db.studioCreatorProfile.findMany({
    orderBy: { followerCount: "desc" },
    take,
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

export async function getFollowedCreatorsFeed(take = 24) {
  const user = await requireAuth();
  const follows = await db.studioCreatorFollow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const ids = follows.map((f) => f.followingId);
  if (!ids.length) return [];

  return db.studioAsset.findMany({
    where: { creatorId: { in: ids }, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take,
    include: { creator: { select: { id: true, username: true, name: true, image: true } } },
  });
}

export async function searchStudioCreators(q: string) {
  const term = q.trim();
  if (!term) return listStudioCreators();

  return db.studioCreatorProfile.findMany({
    where: {
      OR: [
        { handle: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
      ],
    },
    take: 24,
    include: { user: { select: { id: true, username: true, name: true, image: true } } },
  });
}
