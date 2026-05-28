"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function getStreamerProfile(userId?: string) {
  const user = await requireAuth();
  const targetId = userId ?? user.id;
  const profile = await db.streamerProfile.findUnique({
    where: { userId: targetId },
    include: {
      user: {
        select: {
          username: true,
          image: true,
          supportTierReceived: true,
          _count: { select: { followers: true } },
        },
      },
    },
  });
  return profile;
}

export async function updateStreamerProfile(data: {
  bio?: string;
  announcement?: string;
  scheduleNote?: string;
}) {
  const user = await requireAuth();
  await db.streamerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      bio: data.bio?.trim().slice(0, 500) || null,
      announcement: data.announcement?.trim().slice(0, 500) || null,
      scheduleNote: data.scheduleNote?.trim().slice(0, 300) || null,
    },
    update: {
      bio: data.bio?.trim().slice(0, 500) || null,
      announcement: data.announcement?.trim().slice(0, 500) || null,
      scheduleNote: data.scheduleNote?.trim().slice(0, 300) || null,
    },
  });
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/settings/streamer");
  return { success: true as const };
}
