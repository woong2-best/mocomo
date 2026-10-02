import { db } from "@/lib/db";
import { displayableImageUrl, isPublicHttpUrl } from "@/lib/displayable-image-url";
import { splitStoredBirthDate } from "@/lib/birth-date";
import { birthDateCollectionMeta } from "@/lib/age-policy";
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
  usernameChangesRemaining,
} from "@/lib/username-policy";

export type ProfileUpdateInput = {
  bio?: string;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  /** Replaces the whole column — callers must merge, not rebuild. */
  snsLinks?: Prisma.InputJsonObject;
  favoriteTags?: string[];
  mainCharacter?: string;
  showNsfw?: boolean;
  showBirthdayOnProfile?: boolean;
  username?: string;
  name?: string;
  image?: string | null;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  clearBirthDate?: boolean;
};

export type ProfileSettingsSnapshot = {
  id: string;
  username: string;
  name: string;
  image: string;
  bio: string;
  bannerUrl: string;
  bannerVideoUrl: string;
  mainCharacter: string;
  favoriteTags: string;
  location: string;
  website: string;
  showNsfw: boolean;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  showBirthdayOnProfile: boolean;
  usernameChangesRemaining: number;
  usernameChangeResetAt: string | null;
  locale: string;
  countryCode: string;
  timeZone: string;
  feedRecommendationEnabled: boolean;
  showLikeCounts: boolean;
};

export async function getProfileSettingsForUser(
  userId: string
): Promise<ProfileSettingsSnapshot | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) return null;

  const sns = (user.profile?.snsLinks ?? {}) as { location?: string; website?: string };
  const birth = splitStoredBirthDate(user.birthDate);
  const recentUsernameChanges = await db.usernameChangeLog.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: usernameChangeWindowStart() },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const resetAt = usernameChangeResetAt(recentUsernameChanges);

  return {
    id: user.id,
    username: user.username,
    name: user.name ?? "",
    image: displayableImageUrl(user.image) ?? "",
    bio: user.profile?.bio ?? "",
    bannerUrl: user.profile?.bannerUrl ?? "",
    bannerVideoUrl: user.profile?.bannerVideoUrl ?? "",
    mainCharacter: user.profile?.mainCharacter ?? "",
    favoriteTags: user.profile?.favoriteTags?.join(", ") ?? "",
    location: sns.location ?? "",
    website: sns.website ?? "",
    showNsfw: user.showNsfw,
    birthYear: birth.year,
    birthMonth: birth.month,
    birthDay: birth.day,
    showBirthdayOnProfile: user.profile?.showBirthdayOnProfile ?? false,
    usernameChangesRemaining: usernameChangesRemaining(recentUsernameChanges.length),
    usernameChangeResetAt: resetAt?.toISOString() ?? null,
    locale: user.locale,
    countryCode: user.countryCode,
    timeZone: user.timeZone,
    feedRecommendationEnabled: user.feedRecommendationEnabled,
    showLikeCounts: user.showLikeCounts,
  };
}

export async function applyProfileUpdateForUser(
  userId: string,
  data: ProfileUpdateInput
): Promise<{ success: true } | { error: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, image: true },
  });
  if (!user) return { error: "User not found." };

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

  if (usernameChanged) {
    if (!nextUsername || !isValidUsername(nextUsername)) {
      return { error: "Username must be 3–20 letters, numbers, or underscores." };
    }
    if (RESERVED_USERNAMES.has(nextUsername)) {
      return { error: "This username isn't available." };
    }
    const usernameCheck = validateUsernameAndName(nextUsername, name);
    if (!usernameCheck.ok) return { error: usernameCheck.error };

    const taken = await findUserByUsernameInsensitive(nextUsername);
    if (taken && taken.id !== user.id) {
      return { error: `@${nextUsername} 아이디는 이미 사용 중입니다.` };
    }

    const recentUsernameChanges = await db.usernameChangeLog.findMany({
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
    if (!bannerUrl) {
      profilePayload.bannerUrl = null;
    } else if (isPublicHttpUrl(bannerUrl)) {
      profilePayload.bannerUrl = bannerUrl;
      profilePayload.bannerVideoUrl = null;
    }
  }
  if (bannerVideoUrl !== undefined) {
    if (!bannerVideoUrl) {
      profilePayload.bannerVideoUrl = null;
    } else if (isPublicHttpUrl(bannerVideoUrl)) {
      profilePayload.bannerVideoUrl = bannerVideoUrl;
      profilePayload.bannerUrl = null;
    }
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
    birthDateSource?: "SIGNUP" | "OAUTH_COMPLETE" | "PROFILE_EDIT" | "ADMIN";
    birthDateCollectedAt?: Date | null;
  } = {};
  if (showNsfw !== undefined) userUpdate.showNsfw = showNsfw;
  if (usernameChanged && nextUsername) userUpdate.username = nextUsername;
  if (name !== undefined) userUpdate.name = name || null;
  if (image !== undefined) {
    if (!image) userUpdate.image = null;
    else if (isPublicHttpUrl(image)) userUpdate.image = image;
  } else if (user.image && !isPublicHttpUrl(user.image)) {
    userUpdate.image = null;
  }

  if (clearBirthDate) {
    userUpdate.birthDate = null;
    userUpdate.birthDateCollectedAt = null;
  } else if (
    birthYear !== undefined &&
    birthMonth !== undefined &&
    birthDay !== undefined
  ) {
    const birth = parseBirthDateInput(birthYear, birthMonth, birthDay);
    if (!birth) return { error: "Enter a valid birth date." };
    userUpdate.birthDate = birth;
    Object.assign(userUpdate, birthDateCollectionMeta("PROFILE_EDIT"));
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

    if (usernameChanged && nextUsername) {
      await tx.usernameChangeLog.create({
        data: {
          userId: user.id,
          oldUsername: currentUsername,
          newUsername: nextUsername,
        },
      });
    }
  });

  return { success: true };
}
