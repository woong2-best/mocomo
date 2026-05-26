"use server";

import type { SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

function mapLiveChatMessage(m: {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    image: string | null;
    supportTierSent: SupportTierLevel;
  };
}) {
  return {
    id: m.id,
    userId: m.user.id,
    username: m.user.username,
    image: m.user.image,
    supportTierSent: m.user.supportTierSent,
    content: m.content,
    at: m.createdAt.getTime(),
  };
}
import { generateLiveJoinPassword, hashLiveJoinPassword, verifyLiveJoinPassword } from "@/lib/live-password";
import { countActiveLiveViewers, resolveLiveChannelAccess } from "@/lib/live-room-access";
import { liveViewerCutoff } from "@/lib/live-presence";
import { revalidatePath } from "next/cache";

export async function createLiveStream(data: {
  name: string;
  communityId?: string;
  maxUsers?: number;
  allowScreen?: boolean;
  allowCamera?: boolean;
}) {
  const user = await requireAuth();
  const joinPassword = generateLiveJoinPassword();
  const joinPasswordHash = await hashLiveJoinPassword(joinPassword);

  const channel = await db.voiceChannel.create({
    data: {
      name: data.name,
      communityId: data.communityId,
      maxUsers: data.maxUsers ?? 200,
      allowScreen: data.allowScreen ?? true,
      allowCamera: data.allowCamera ?? true,
      createdBy: user.id,
      joinPasswordHash,
      isLive: true,
      members: {
        create: {
          userId: user.id,
          role: "HOST",
          lastSeenAt: new Date(),
        },
      },
    },
  });

  revalidatePath("/live");
  return { channel, joinPassword };
}

export async function joinLiveStreamWithPassword(channelId: string, password: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      isLive: true,
      joinPasswordHash: true,
      maxUsers: true,
      createdBy: true,
    },
  });

  if (!channel || !channel.isLive) return { error: "종료되었거나 없는 방송입니다." };
  if (channel.createdBy === user.id) {
    await upsertLiveMember(channelId, user.id, "HOST");
    return { success: true as const };
  }

  if (!channel.joinPasswordHash) {
    return { error: "이 방송은 비밀번호가 설정되지 않았습니다. 방송을 새로 시작해 주세요." };
  }

  const ok = await verifyLiveJoinPassword(password, channel.joinPasswordHash);
  if (!ok) return { error: "합방 비밀번호가 일치하지 않습니다." };

  const active = await countActiveLiveViewers(channelId);
  if (active >= channel.maxUsers) {
    return { error: "시청 인원이 가득 찼습니다. 잠시 후 다시 시도해 주세요." };
  }

  await upsertLiveMember(channelId, user.id, "VIEWER");
  return { success: true as const };
}

async function upsertLiveMember(channelId: string, userId: string, role: "HOST" | "VIEWER") {
  await db.voiceMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId, role, lastSeenAt: new Date() },
    update: { role, lastSeenAt: new Date() },
  });
}

export async function heartbeatLivePresence(channelId: string) {
  const user = await requireAuth();
  const access = await resolveLiveChannelAccess(channelId, user.id);
  if (!access.allowed) return { error: "NOT_MEMBER" as const };

  await db.voiceMember.update({
    where: { channelId_userId: { channelId, userId: user.id } },
    data: { lastSeenAt: new Date() },
  });

  const viewerCount = await countActiveLiveViewers(channelId);
  return { viewerCount };
}

export async function sendLiveChatMessage(channelId: string, content: string) {
  const user = await requireAuth();
  const text = content.trim().slice(0, 200);
  if (!text) return { error: "메시지를 입력해 주세요." };

  const access = await resolveLiveChannelAccess(channelId, user.id);
  if (!access.allowed) return { error: "방송에 참여한 뒤 채팅할 수 있습니다." };

  const msg = await db.liveChatMessage.create({
    data: { channelId, userId: user.id, content: text },
    include: {
      user: { select: userPublicSelectMinimal },
    },
  });

  await db.voiceMember.update({
    where: { channelId_userId: { channelId, userId: user.id } },
    data: { lastSeenAt: new Date() },
  });

  return { message: mapLiveChatMessage(msg) };
}

export async function getLiveStreamSync(channelId: string, since?: string) {
  const user = await requireAuth();
  const access = await resolveLiveChannelAccess(channelId, user.id);
  if (!access.allowed) {
    return { error: "NOT_MEMBER" as const };
  }

  const sinceDate = since ? new Date(since) : new Date(0);
  const messages = await db.liveChatMessage.findMany({
    where: { channelId, createdAt: { gt: sinceDate } },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: userPublicSelectMinimal } },
  });

  const viewerCount = await countActiveLiveViewers(channelId);
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, name: true, createdBy: true },
  });

  return {
    viewerCount,
    isLive: channel?.isLive ?? false,
    isHost: access.isHost,
    hostUserId: access.hostUserId,
    messages: messages.map(mapLiveChatMessage),
  };
}

export async function endLiveStream(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };
  if (channel.createdBy !== user.id) return { error: "방송 종료는 호스트만 할 수 있습니다." };

  await db.voiceChannel.update({
    where: { id: channelId },
    data: { isLive: false },
  });
  await db.voiceMember.deleteMany({ where: { channelId } });

  revalidatePath("/live");
  revalidatePath(`/voice/${channelId}`);
  return { success: true as const };
}

export async function leaveLiveStream(channelId: string) {
  const user = await requireAuth();
  await db.voiceMember.deleteMany({
    where: { channelId, userId: user.id },
  });

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  const remaining = await db.voiceMember.count({ where: { channelId } });
  if (remaining === 0 && channel?.createdBy === user.id) {
    await db.voiceChannel.update({
      where: { id: channelId },
      data: { isLive: false },
    });
  }
  return { success: true as const };
}

/** 최근 채팅 히스토리 (입장 시) */
export async function loadLiveChatHistory(channelId: string) {
  const user = await requireAuth();
  const access = await resolveLiveChannelAccess(channelId, user.id);
  if (!access.allowed) return { error: "NOT_MEMBER" as const };

  const messages = await db.liveChatMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: userPublicSelectMinimal } },
  });

  return { messages: messages.reverse().map(mapLiveChatMessage) };
}

export async function pruneStaleLiveViewers(channelId: string) {
  await db.voiceMember.deleteMany({
    where: {
      channelId,
      role: "VIEWER",
      lastSeenAt: { lt: liveViewerCutoff() },
    },
  });
}
