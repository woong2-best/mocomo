"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function slugifyHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
}

export async function ensureStudioCreatorProfile() {
  const user = await requireAuth();
  const existing = await db.studioCreatorProfile.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  let handle = slugifyHandle(user.username);
  if (!handle) handle = `creator-${user.id.slice(-6)}`;

  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? handle : `${handle}${suffix}`;
    const taken = await db.studioCreatorProfile.findUnique({ where: { handle: candidate } });
    if (!taken) {
      return db.studioCreatorProfile.create({
        data: {
          userId: user.id,
          handle: candidate,
          displayName: user.name ?? user.username,
        },
      });
    }
    suffix += 1;
  }
}

export async function updateStudioCreatorProfile(data: {
  displayName?: string;
  bio?: string;
  bannerUrl?: string;
  featuredAssetId?: string | null;
}) {
  const user = await requireAuth();
  await ensureStudioCreatorProfile();

  await db.studioCreatorProfile.update({
    where: { userId: user.id },
    data: {
      displayName: data.displayName?.trim(),
      bio: data.bio?.trim() || null,
      bannerUrl: data.bannerUrl || null,
      featuredAssetId: data.featuredAssetId ?? undefined,
    },
  });

  const profile = await db.studioCreatorProfile.findUniqueOrThrow({ where: { userId: user.id } });
  revalidatePath(`/studio/creator/${profile.handle}`);
  revalidatePath("/studio/settings");
  return { success: true };
}

export async function getStudioCreatorByHandle(handle: string) {
  const profile = await db.studioCreatorProfile.findUnique({
    where: { handle },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });
  if (!profile) return null;

  const assets = await db.studioAsset.findMany({
    where: { creatorId: profile.userId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 48,
  });

  let featured: (typeof assets)[0] | null = null;
  if (profile.featuredAssetId) {
    featured = assets.find((a) => a.id === profile.featuredAssetId) ?? null;
    if (!featured) {
      featured = await db.studioAsset.findFirst({
        where: { id: profile.featuredAssetId, creatorId: profile.userId, status: "PUBLISHED" },
      });
    }
  }

  return { profile, assets, featured };
}

export async function toggleStudioFollow(creatorUserId: string) {
  const user = await requireAuth();
  if (user.id === creatorUserId) return { error: "본인은 팔로우할 수 없습니다." };

  const existing = await db.studioCreatorFollow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: creatorUserId } },
  });

  if (existing) {
    await db.$transaction([
      db.studioCreatorFollow.delete({ where: { id: existing.id } }),
      db.studioCreatorProfile.updateMany({
        where: { userId: creatorUserId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);
    return { following: false };
  }

  await db.$transaction([
    db.studioCreatorFollow.create({
      data: { followerId: user.id, followingId: creatorUserId },
    }),
    db.studioCreatorProfile.updateMany({
      where: { userId: creatorUserId },
      data: { followerCount: { increment: 1 } },
    }),
  ]);

  return { following: true };
}

export async function isFollowingCreator(creatorUserId: string) {
  const user = await requireAuth();
  const row = await db.studioCreatorFollow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: creatorUserId } },
  });
  return !!row;
}
