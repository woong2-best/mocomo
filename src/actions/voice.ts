"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function createVoiceChannel(data: {
  name: string;
  communityId?: string;
  maxUsers?: number;
  allowScreen?: boolean;
  allowCamera?: boolean;
}) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.create({
    data: {
      name: data.name,
      communityId: data.communityId,
      maxUsers: data.maxUsers ?? 50,
      allowScreen: data.allowScreen ?? true,
      allowCamera: data.allowCamera ?? true,
      createdBy: user.id,
      members: { create: { userId: user.id } },
      isLive: true,
    },
    include: { members: { include: { user: { select: { id: true, username: true, image: true } } } } },
  });
  return { channel, livekitToken: null };
}

export async function joinVoiceChannel(channelId: string) {
  const user = await requireAuth();
  await db.voiceMember.upsert({
    where: { channelId_userId: { channelId, userId: user.id } },
    create: { channelId, userId: user.id },
    update: {},
  });
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    include: { members: { include: { user: true } } },
  });
  return { channel };
}

export async function updateVoiceState(
  channelId: string,
  state: { isMuted?: boolean; isDeafened?: boolean; cameraOn?: boolean; screenOn?: boolean }
) {
  const user = await requireAuth();
  await db.voiceMember.update({
    where: { channelId_userId: { channelId, userId: user.id } },
    data: state,
  });
  return { success: true };
}

export async function leaveVoiceChannel(channelId: string) {
  const user = await requireAuth();
  await db.voiceMember.delete({
    where: { channelId_userId: { channelId, userId: user.id } },
  });
  const remaining = await db.voiceMember.count({ where: { channelId } });
  if (remaining === 0) {
    await db.voiceChannel.update({ where: { id: channelId }, data: { isLive: false } });
  }
  return { success: true };
}
