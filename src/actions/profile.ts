"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_POSTS_CACHE_TAG, profileUserCacheTag } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateUsernameAndName } from "@/lib/forbidden-admin-sequence";
import { parseBirthDateInput } from "@/lib/used-youth-protection";
import type { Prisma } from "@prisma/client";
import { findUserByUsernameInsensitive } from "@/lib/signup-user-resolve";
import {
  RESERVED_USERNAMES,
  USERNAME_CHANGE_LIMIT,
  USERNAME_CHANGE_WINDOW_DAYS,
  isValidUsername,
  normalizeUsername,
  usernameChangeResetAt,
  usernameChangeWindowStart,
} from "@/lib/username-policy";

export async function updateProfile(data: {
  bio?: string;
  bannerUrl?: string;
  bannerVideoUrl?: string;
  snsLinks?: Record<string, string>;
  favoriteTags?: string[];
  mainCharacter?: string;
  nicknameEffect?: string;
  showNsfw?: boolean;
  showBirthdayOnProfile?: boolean;
  username?: string;
  name?: string;
  image?: string;
  /** 모두 비우면 생일 삭제 */
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  clearBirthDate?: boolean;
}) {
  const user = await requireAuth();
  const {
    username,
    name,
    image,
    showNsfw,
    birthYear,
    birthMonth,
    birthDay,
    clearBirthDate,
    showBirthdayOnProfile,
    bannerUrl,
    bannerVideoUrl,
    ...profileData
  } = data;
  const currentUsername = user.username;
  const nextUsername = username !== undefined ? normalizeUsername(username) : undefined;
  const usernameChanged =
    nextUsername !== undefined && nextUsername !== normalizeUsername(currentUsername);

  if (name !== undefined) {
    const check = validateUsernameAndName(nextUsername ?? currentUsername, name);
    if (!check.ok) return { error: check.error };
  }

  let recentUsernameChanges: { createdAt: Date }[] = [];
  if (usernameChanged) {
    if (!isValidUsername(nextUsername)) {
      return { error: "아이디는 영문·숫자·_ 3~20자입니다." };
    }

    if (RESERVED_USERNAMES.has(nextUsername)) {
      return { error: "사용할 수 없는 아이디입니다." };
    }

    const usernameCheck = validateUsernameAndName(nextUsername, name);
    if (!usernameCheck.ok) return { error: usernameCheck.error };

    const taken = await findUserByUsernameInsensitive(nextUsername);
    if (taken && taken.id !== user.id) {
      return { error: `@${nextUsername} 아이디는 이미 사용 중입니다.` };
    }

    recentUsernameChanges = await db.usernameChangeLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: usernameChangeWindowStart() },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    if (recentUsernameChanges.length >= USERNAME_CHANGE_LIMIT) {
      const resetAt = usernameChangeResetAt(recentUsernameChanges);
      const resetText = resetAt
        ? ` 다음 가능 시간: ${resetAt.toLocaleString("ko-KR")}`
        : "";
      return {
        error: `아이디는 ${USERNAME_CHANGE_WINDOW_DAYS}일에 ${USERNAME_CHANGE_LIMIT}번만 변경할 수 있습니다.${resetText}`,
      };
    }
  }

  const profilePayload: Prisma.ProfileUpdateInput = { ...profileData };
  if (bannerUrl !== undefined) {
    profilePayload.bannerUrl = bannerUrl || null;
    if (bannerUrl) profilePayload.bannerVideoUrl = null;
  }
  if (bannerVideoUrl !== undefined) {
    profilePayload.bannerVideoUrl = bannerVideoUrl || null;
    if (bannerVideoUrl) profilePayload.bannerUrl = null;
  }
  if (showBirthdayOnProfile !== undefined) {
    profilePayload.showBirthdayOnProfile = showBirthdayOnProfile;
  }

  const userUpdate: {
    showNsfw?: boolean;
    username?: string;
    name?: string | null;
    image?: string | null;
    birthDate?: Date | null;
  } = {};
  if (showNsfw !== undefined) userUpdate.showNsfw = showNsfw;
  if (usernameChanged) userUpdate.username = nextUsername;
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

  await db.$transaction(async (tx) => {
    await tx.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...profileData,
        ...(bannerUrl !== undefined ? { bannerUrl: bannerUrl || null } : {}),
        ...(bannerVideoUrl !== undefined ? { bannerVideoUrl: bannerVideoUrl || null } : {}),
        ...(showBirthdayOnProfile !== undefined ? { showBirthdayOnProfile } : {}),
      },
      update: profilePayload,
    });

    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({ where: { id: user.id }, data: userUpdate });
    }

    if (usernameChanged) {
      await tx.usernameChangeLog.create({
        data: {
          userId: user.id,
          oldUsername: currentUsername,
          newUsername: nextUsername,
        },
      });
    }
  });

  if (
    userUpdate.name !== undefined ||
    userUpdate.image !== undefined ||
    usernameChanged
  ) {
    revalidateTag(FEED_POSTS_CACHE_TAG);
    revalidatePath(`/cosplay/${currentUsername}`);
    if (usernameChanged) revalidatePath(`/cosplay/${nextUsername}`);
  }

  revalidatePath(`/u/${currentUsername}`);
  revalidateTag(profileUserCacheTag(currentUsername));
  if (usernameChanged) {
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

