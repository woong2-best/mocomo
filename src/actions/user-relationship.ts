"use server";

import { revalidatePath } from "next/cache";
import { requireAuthMinimal } from "@/lib/auth";
import { db } from "@/lib/db";

export async function blockUserAction(targetUserId: string, username: string) {
  const user = await requireAuthMinimal();
  if (user.id === targetUserId) {
    return { error: "자기 자신은 차단할 수 없습니다." };
  }

  await db.$transaction([
    db.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId: user.id, blockedId: targetUserId },
      },
      create: { blockerId: user.id, blockedId: targetUserId },
      update: {},
    }),
    db.follow.deleteMany({
      where: {
        OR: [
          { followerId: user.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: user.id },
        ],
      },
    }),
  ]);

  revalidatePath(`/u/${username}`);
  return { success: true as const, blocked: true as const };
}

export async function unblockUserAction(targetUserId: string, username: string) {
  const user = await requireAuthMinimal();

  await db.userBlock.deleteMany({
    where: { blockerId: user.id, blockedId: targetUserId },
  });

  revalidatePath(`/u/${username}`);
  return { success: true as const, blocked: false as const };
}

export async function toggleMuteUserAction(targetUserId: string, username: string) {
  const user = await requireAuthMinimal();
  if (user.id === targetUserId) {
    return { error: "자기 자신은 뮤트할 수 없습니다." };
  }

  const existing = await db.userMute.findUnique({
    where: {
      muterId_mutedId: { muterId: user.id, mutedId: targetUserId },
    },
    select: { id: true },
  });

  if (existing) {
    await db.userMute.delete({ where: { id: existing.id } });
    revalidatePath(`/u/${username}`);
    return { muted: false as const };
  }

  await db.userMute.create({
    data: { muterId: user.id, mutedId: targetUserId },
  });
  revalidatePath(`/u/${username}`);
  return { muted: true as const };
}
