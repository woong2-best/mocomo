"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_POSTS_CACHE_TAG, profileUserCacheTag } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateUsernameAndName } from "@/lib/forbidden-admin-sequence";
import { xpForLevel } from "@/lib/utils";
import { parseBirthDateInput } from "@/lib/used-youth-protection";
import type { Prisma } from "@prisma/client";

export async function updateProfile(data: {
  bio?: string;
  bannerUrl?: string;
  snsLinks?: Record<string, string>;
  favoriteTags?: string[];
  mainCharacter?: string;
  nicknameEffect?: string;
  showNsfw?: boolean;
  showBirthdayOnProfile?: boolean;
  name?: string;
  image?: string;
  /** 모두 비우면 생일 삭제 */
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  clearBirthDate?: boolean;
}) {
  const user = await requireAuth();
  const { name, image, showNsfw, birthYear, birthMonth, birthDay, clearBirthDate, showBirthdayOnProfile, ...profileData } = data;

  if (name !== undefined) {
    const check = validateUsernameAndName(user.username, name);
    if (!check.ok) return { error: check.error };
  }
  const profilePayload: Prisma.ProfileUpdateInput = { ...profileData };
  if (showBirthdayOnProfile !== undefined) {
    profilePayload.showBirthdayOnProfile = showBirthdayOnProfile;
  }

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...profileData,
      ...(showBirthdayOnProfile !== undefined ? { showBirthdayOnProfile } : {}),
    },
    update: profilePayload,
  });

  const userUpdate: {
    showNsfw?: boolean;
    name?: string | null;
    image?: string | null;
    birthDate?: Date | null;
  } = {};
  if (showNsfw !== undefined) userUpdate.showNsfw = showNsfw;
  if (name !== undefined) userUpdate.name = name || null;
  if (image !== undefined) userUpdate.image = image || null;

  if (clearBirthDate) {
    userUpdate.birthDate = null;
  } else if (
    birthYear !== undefined &&
    birthMonth !== undefined &&
    birthDay !== undefined
  ) {
    const birth = parseBirthDateInput(birthYear, birthMonth, birthDay);
    if (!birth) return { error: "올바른 생년월일을 입력해 주세요." };
    userUpdate.birthDate = birth;
  }

  if (Object.keys(userUpdate).length > 0) {
    await db.user.update({ where: { id: user.id }, data: userUpdate });
    if (userUpdate.name !== undefined || userUpdate.image !== undefined) {
      revalidateTag(FEED_POSTS_CACHE_TAG);
      revalidatePath(`/cosplay/${user.username}`);
    }
  }
  revalidatePath(`/u/${user.username}`);
  revalidateTag(profileUserCacheTag(user.username));
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

export async function addXp(amount: number) {
  const user = await requireAuth();
  let newXp = user.xp + amount;
  let newLevel = user.level;
  while (newXp >= xpForLevel(newLevel + 1)) {
    newXp -= xpForLevel(newLevel + 1);
    newLevel += 1;
  }
  await db.user.update({
    where: { id: user.id },
    data: { xp: newXp, level: newLevel },
  });
  return { level: newLevel, xp: newXp };
}
