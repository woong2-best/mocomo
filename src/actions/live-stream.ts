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
import type { LiveBroadcastMode, LiveStreamCategory } from "@prisma/client";
import { generateLiveJoinPassword, hashLiveJoinPassword, verifyLiveJoinPassword } from "@/lib/live-password";
import { countActiveLiveViewers, resolveLiveChannelAccess } from "@/lib/live-room-access";
import { liveViewerCutoff } from "@/lib/live-presence";
import { parseLiveTagsInput } from "@/lib/live-categories";
import {
  filterLiveChatContent,
  looksLikeSpamDuplicate,
} from "@/lib/live-chat-filter";
import { moderateChatWithAi } from "@/lib/ai-moderation";
import { startChannelEgress, stopChannelEgress, isLivekitEgressConfigured } from "@/lib/livekit-egress";
import { createObsRtmpIngress, deleteObsRtmpIngress } from "@/lib/livekit-ingress";
import { notifyFollowersOnLive } from "@/lib/live-notify";
import { revalidatePath } from "next/cache";

export async function createLiveStream(data: {
  name: string;
  communityId?: string;
  maxUsers?: number;
  allowScreen?: boolean;
  allowCamera?: boolean;
  category?: LiveStreamCategory;
  tags?: string[] | string;
  thumbnailUrl?: string;
  description?: string;
  scheduledAt?: string;
  donationGoalKrw?: number;
  broadcastMode?: LiveBroadcastMode;
}) {
  const user = await requireAuth();
  const joinPassword = generateLiveJoinPassword();
  const joinPasswordHash = await hashLiveJoinPassword(joinPassword);

  const tags = Array.isArray(data.tags)
    ? data.tags.slice(0, 8)
    : typeof data.tags === "string"
      ? parseLiveTagsInput(data.tags)
      : [];
  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

  const channel = await db.voiceChannel.create({
    data: {
      name: data.name,
      communityId: data.communityId,
      maxUsers: data.maxUsers ?? 200,
      allowScreen: data.allowScreen ?? true,
      allowCamera: data.allowCamera ?? true,
      createdBy: user.id,
      joinPasswordHash,
      isLive: !isScheduled,
      liveStatus: isScheduled ? "SCHEDULED" : "LIVE",
      category: data.category ?? "JUST_CHATTING",
      tags,
      thumbnailUrl: data.thumbnailUrl?.trim() || null,
      description: data.description?.trim().slice(0, 500) || null,
      scheduledAt: isScheduled ? scheduledAt : null,
      donationGoalKrw: data.donationGoalKrw && data.donationGoalKrw > 0 ? data.donationGoalKrw : null,
      broadcastMode: data.broadcastMode ?? "BROWSER",
      members: isScheduled
        ? undefined
        : {
            create: {
              userId: user.id,
              role: "HOST",
              lastSeenAt: new Date(),
            },
          },
    },
  });

  await db.streamerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  revalidatePath("/live");
  if (!isScheduled) {
    void notifyFollowersOnLive(user.id, channel.id, data.name).catch(() => {});
  }
  return {
    channel,
    joinPassword: isScheduled ? undefined : joinPassword,
    scheduled: Boolean(isScheduled),
  };
}

export async function startScheduledLiveStream(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, liveStatus: true, name: true },
  });
  if (!channel || channel.createdBy !== user.id) {
    return { error: "예약 방송을 찾을 수 없거나 권한이 없습니다." };
  }
  if (channel.liveStatus !== "SCHEDULED") {
    return { error: "예약 상태의 방송만 시작할 수 있습니다." };
  }
  const joinPassword = generateLiveJoinPassword();
  const joinPasswordHash = await hashLiveJoinPassword(joinPassword);
  await db.voiceChannel.update({
    where: { id: channelId },
    data: {
      isLive: true,
      liveStatus: "LIVE",
      joinPasswordHash,
      scheduledAt: null,
    },
  });
  await upsertLiveMember(channelId, user.id, "HOST");
  void notifyFollowersOnLive(user.id, channelId, channel.name).catch(() => {});
  revalidatePath("/live");
  return { joinPassword, channelId };
}

export async function getLiveChannelRoomMeta(channelId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      isLive: true,
      liveStatus: true,
      createdBy: true,
      createdAt: true,
      category: true,
      tags: true,
      thumbnailUrl: true,
      description: true,
      donationGoalKrw: true,
      vodUrl: true,
      endedAt: true,
      slowModeSeconds: true,
      chatBannedWords: true,
      broadcastMode: true,
      rtmpUrl: true,
      rtmpStreamKey: true,
    },
  });
  if (!channel) return null;

  const host = await db.user.findUnique({
    where: { id: channel.createdBy },
    select: {
      id: true,
      username: true,
      image: true,
      supportTierSent: true,
      supportTierReceived: true,
      totalSupportReceived: true,
    },
  });
  if (!host) return null;

  const tipTotal = await db.tip.aggregate({
    where: {
      receiverId: channel.createdBy,
      createdAt: { gte: channel.createdAt },
    },
    _sum: { amount: true },
  });

  const tipRanking = await db.tip.groupBy({
    by: ["senderId"],
    where: {
      receiverId: channel.createdBy,
      createdAt: { gte: channel.createdAt },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });
  const senderIds = tipRanking.map((t) => t.senderId);
  const senders =
    senderIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, username: true, supportTierSent: true },
        })
      : [];
  const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]));

  return {
    channel,
    host,
    tipTotalKrw: tipTotal._sum.amount ?? 0,
    tipRanking: tipRanking.map((t) => ({
      amount: t._sum.amount ?? 0,
      username: senderMap[t.senderId]?.username ?? "?",
      tier: senderMap[t.senderId]?.supportTierSent ?? "PEBBLE",
    })),
  };
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

  const access = await resolveLiveChannelAccess(channelId, user.id);
  if (!access.allowed) return { error: "방송에 참여한 뒤 채팅할 수 있습니다." };

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { slowModeSeconds: true, chatBannedWords: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };

  const filtered = filterLiveChatContent(content, channel.chatBannedWords);
  if (!filtered.ok) return { error: filtered.error };
  const text = filtered.text;

  const ai = await moderateChatWithAi(text);
  if (!ai.ok) return { error: ai.error };

  if (channel.slowModeSeconds > 0 && !access.isHost) {
    const last = await db.liveChatMessage.findFirst({
      where: { channelId, userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, content: true },
    });
    if (last) {
      const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
      if (elapsed < channel.slowModeSeconds) {
        return { error: `슬로우 모드: ${Math.ceil(channel.slowModeSeconds - elapsed)}초 후에 다시 보낼 수 있습니다.` };
      }
      if (looksLikeSpamDuplicate(last.content, text)) {
        return { error: "같은 메시지를 연속으로 보낼 수 없습니다." };
      }
    }
  }

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
    select: { isLive: true, name: true, createdBy: true, createdAt: true },
  });

  const tipSince = channel?.createdAt ?? new Date(Date.now() - 3600000);
  const tipAfter = sinceDate > tipSince ? sinceDate : tipSince;
  const recentTips = await db.tip.findMany({
    where: {
      receiverId: access.hostUserId,
      createdAt: { gt: tipAfter },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { sender: { select: { username: true } } },
  });

  return {
    viewerCount,
    isLive: channel?.isLive ?? false,
    isHost: access.isHost,
    hostUserId: access.hostUserId,
    messages: messages.map(mapLiveChatMessage),
    recentTips: recentTips.map((t) => ({
      id: t.id,
      amount: t.amount,
      message: t.message,
      username: t.sender.username,
      at: t.createdAt.getTime(),
    })),
  };
}

export async function deleteLiveChatMessage(channelId: string, messageId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const isMod = dbUser?.role === "MODERATOR" || dbUser?.role === "ADMIN";
  if (channel.createdBy !== user.id && !isMod) {
    return { error: "채팅 삭제 권한이 없습니다." };
  }

  await db.liveChatMessage.deleteMany({
    where: { id: messageId, channelId },
  });
  return { success: true as const };
}

export async function setLiveVodUrl(channelId: string, vodUrl: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel || channel.createdBy !== user.id) {
    return { error: "호스트만 다시보기 URL을 설정할 수 있습니다." };
  }
  const url = vodUrl.trim();
  if (!url) return { error: "URL을 입력해 주세요." };
  await db.voiceChannel.update({
    where: { id: channelId },
    data: { vodUrl: url },
  });
  revalidatePath(`/voice/${channelId}`);
  return { success: true as const };
}

/** OBS Studio RTMP 송출용 URL·스트림 키 발급 (방송당 1개, 동시 다중 방송은 방 ID별로 분리) */
export async function ensureObsIngress(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      isLive: true,
      rtmpIngressId: true,
      rtmpUrl: true,
      rtmpStreamKey: true,
      name: true,
    },
  });
  if (!channel || channel.createdBy !== user.id || !channel.isLive) {
    return { error: "호스트만 OBS 설정을 받을 수 있습니다." };
  }

  if (channel.rtmpUrl && channel.rtmpStreamKey && channel.rtmpIngressId) {
    return {
      url: channel.rtmpUrl,
      streamKey: channel.rtmpStreamKey,
      ingressId: channel.rtmpIngressId,
    };
  }

  const hostName =
    (await db.user.findUnique({ where: { id: user.id }, select: { username: true } }))?.username ??
    "host";
  const created = await createObsRtmpIngress(channelId, hostName);
  if ("error" in created) return { error: created.error };

  await db.voiceChannel.update({
    where: { id: channelId },
    data: {
      broadcastMode: "OBS",
      rtmpIngressId: created.ingressId,
      rtmpUrl: created.url,
      rtmpStreamKey: created.streamKey,
    },
  });

  void ensureLiveRecording(channelId).catch(() => {});

  return {
    url: created.url,
    streamKey: created.streamKey,
    ingressId: created.ingressId,
  };
}

export async function setLiveBroadcastMode(channelId: string, mode: LiveBroadcastMode) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true },
  });
  if (!channel || channel.createdBy !== user.id || !channel.isLive) {
    return { error: "호스트만 송출 방식을 변경할 수 있습니다." };
  }
  await db.voiceChannel.update({
    where: { id: channelId },
    data: { broadcastMode: mode },
  });
  if (mode === "OBS") {
    return ensureObsIngress(channelId);
  }
  return { success: true as const };
}

/** 호스트 스튜디오 입장 시 R2 자동 녹화 (LiveKit Egress) */
export async function ensureLiveRecording(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true, egressId: true },
  });
  if (!channel || channel.createdBy !== user.id || !channel.isLive) {
    return { error: "호스트만 녹화를 시작할 수 있습니다." };
  }
  if (channel.egressId) return { egressId: channel.egressId };
  if (!isLivekitEgressConfigured()) return { skipped: true as const };

  const started = await startChannelEgress(channelId);
  if (started.error) return { error: started.error };
  if (started.egressId) {
    await db.voiceChannel.update({
      where: { id: channelId },
      data: { egressId: started.egressId },
    });
  }
  return { egressId: started.egressId, skipped: started.skipped };
}

export async function endLiveStream(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, egressId: true, rtmpIngressId: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };
  if (channel.createdBy !== user.id) return { error: "방송 종료는 호스트만 할 수 있습니다." };

  if (channel.egressId) {
    await stopChannelEgress(channel.egressId);
  }
  if (channel.rtmpIngressId) {
    await deleteObsRtmpIngress(channel.rtmpIngressId);
  }

  await db.voiceChannel.update({
    where: { id: channelId },
    data: { isLive: false, liveStatus: "ENDED", endedAt: new Date() },
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

export async function updateLiveStreamSettings(
  channelId: string,
  data: { slowModeSeconds?: number; chatBannedWords?: string[] }
) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel || channel.createdBy !== user.id) {
    return { error: "호스트만 방송 설정을 변경할 수 있습니다." };
  }
  await db.voiceChannel.update({
    where: { id: channelId },
    data: {
      slowModeSeconds:
        data.slowModeSeconds !== undefined
          ? Math.min(120, Math.max(0, data.slowModeSeconds))
          : undefined,
      chatBannedWords: data.chatBannedWords?.slice(0, 30),
    },
  });
  return { success: true as const };
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
