"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { profileUserCacheTag } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function isPersistablePhotoUrl(url: string) {
  const u = url.trim();
  if (!u || u.startsWith("blob:") || u.startsWith("data:")) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

export async function enableCosplayerProfile(data: { bio?: string }) {
  const user = await requireAuth();
  const profile = await db.cosplayerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, bio: data.bio },
    update: { bio: data.bio },
  });
  revalidatePath(`/u/${user.username}`);
  return { profile };
}

export async function addCosplayPhoto(data: {
  url: string;
  caption?: string;
  character?: string;
  series?: string;
}) {
  const user = await requireAuth();
  const cosProfile = await db.cosplayerProfile.findUnique({ where: { userId: user.id } });
  if (!cosProfile) return { error: "코스어 프로필이 없습니다." };
  if (!isPersistablePhotoUrl(data.url)) return { error: "유효한 사진을 업로드해 주세요." };

  const photo = await db.cosplayPhoto.create({
    data: {
      profileId: cosProfile.id,
      url: data.url.trim(),
      caption: data.caption?.trim() || undefined,
      character: data.character?.trim() || undefined,
      series: data.series?.trim() || undefined,
    },
  });

  revalidatePath("/cosplay");
  revalidatePath(`/cosplay/${user.username}`);
  revalidatePath(`/u/${user.username}`);
  revalidateTag(profileUserCacheTag(user.username));
  return { success: true, photo };
}

export async function deleteCosplayPhoto(photoId: string) {
  const user = await requireAuth();
  const photo = await db.cosplayPhoto.findUnique({
    where: { id: photoId },
    include: { profile: { select: { userId: true } } },
  });
  if (!photo || photo.profile.userId !== user.id) return { error: "삭제할 수 없습니다." };

  await db.cosplayPhoto.delete({ where: { id: photoId } });

  revalidatePath("/cosplay");
  revalidatePath(`/cosplay/${user.username}`);
  revalidatePath(`/u/${user.username}`);
  revalidateTag(profileUserCacheTag(user.username));
  return { success: true };
}

export async function addCosplaySchedule(data: {
  title: string;
  location?: string;
  startsAt: Date;
  endsAt?: Date;
  type: string;
}) {
  const user = await requireAuth();
  const cosProfile = await db.cosplayerProfile.findUnique({ where: { userId: user.id } });
  if (!cosProfile) throw new Error("NOT_COSPLAYER");
  const schedule = await db.cosplaySchedule.create({
    data: { profileId: cosProfile.id, ...data },
  });
  return { schedule };
}

export async function createFanPost(data: {
  title: string;
  content: string;
  minTipAmount?: number;
  isSubscriberOnly?: boolean;
}) {
  const user = await requireAuth();
  const cosProfile = await db.cosplayerProfile.findUnique({ where: { userId: user.id } });
  if (!cosProfile) throw new Error("NOT_COSPLAYER");
  const post = await db.fanPost.create({
    data: {
      profileId: cosProfile.id,
      creatorId: user.id,
      title: data.title,
      content: data.content,
      minTipAmount: data.minTipAmount ?? 0,
      isSubscriberOnly: data.isSubscriberOnly ?? false,
    },
  });
  return { post };
}
