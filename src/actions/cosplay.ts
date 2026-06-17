"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

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
  if (!cosProfile) throw new Error("NOT_COSPLAYER");
  const photo = await db.cosplayPhoto.create({
    data: { profileId: cosProfile.id, ...data },
  });
  revalidatePath(`/cosplay/${user.username}`);
  return { photo };
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
