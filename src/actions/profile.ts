"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { xpForLevel } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function updateProfile(data: {
  bio?: string;
  bannerUrl?: string;
  snsLinks?: Record<string, string>;
  favoriteTags?: string[];
  mainCharacter?: string;
  nicknameEffect?: string;
  showNsfw?: boolean;
  name?: string;
  image?: string;
}) {
  const user = await requireAuth();
  const { name, image, showNsfw, ...profileData } = data;
  await db.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...profileData },
    update: profileData,
  });
  const userUpdate: { showNsfw?: boolean; name?: string | null; image?: string | null } = {};
  if (showNsfw !== undefined) userUpdate.showNsfw = showNsfw;
  if (name !== undefined) userUpdate.name = name || null;
  if (image !== undefined) userUpdate.image = image || null;
  if (Object.keys(userUpdate).length > 0) {
    await db.user.update({ where: { id: user.id }, data: userUpdate });
  }
  revalidatePath(`/u/${user.username}`);
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
