"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_POSTS_CACHE_TAG, profileUserCacheTag } from "@/lib/cache-tags";
import { requireAuth } from "@/lib/auth";
import {
  applyProfileUpdateForUser,
  type ProfileUpdateInput,
} from "@/lib/profile-update-service";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeUsername } from "@/lib/username-policy";

export async function updateProfile(data: ProfileUpdateInput) {
  const user = await requireAuth();
  const result = await applyProfileUpdateForUser(user.id, data);
  if ("error" in result) return { error: result.error };

  // Must match how the service decides a rename happened, or a renamed profile
  // keeps serving from the old cache tag.
  const nextUsername =
    data.username !== undefined ? normalizeUsername(data.username) : undefined;
  const usernameChanged =
    nextUsername !== undefined && nextUsername !== normalizeUsername(user.username);

  if (
    data.name !== undefined ||
    data.image !== undefined ||
    usernameChanged
  ) {
    revalidateTag(FEED_POSTS_CACHE_TAG);
    revalidatePath(`/cosplay/${user.username}`);
    if (usernameChanged && nextUsername) revalidatePath(`/cosplay/${nextUsername}`);
  }

  revalidatePath(`/u/${user.username}`);
  revalidateTag(profileUserCacheTag(user.username));
  if (usernameChanged && nextUsername) {
    revalidatePath(`/u/${nextUsername}`);
    revalidateTag(profileUserCacheTag(nextUsername));
  }
  revalidatePath("/settings/profile");
  return { success: true };
}

export async function updateOtakuProfile(data: {
  favoriteChars?: string[];
  animeList?: Prisma.InputJsonValue;
  gameList?: Prisma.InputJsonValue;
  mangaList?: Prisma.InputJsonValue;
}) {
  const user = await requireAuth();
  await db.otakuProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  return { success: true };
}
