"use server";

import type {
  LiveBroadcastMode,
  LiveStreamCategory,
  LiveVisibility,
  SupportTierLevel,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireAuthMinimal } from "@/lib/auth";
import { formatLiveCreateError } from "@/lib/live-create-errors";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { tierLabelKo } from "@/lib/live-viewer-access";
import { generateLiveJoinPassword, hashLiveJoinPassword, verifyLiveJoinPassword } from "@/lib/live-password";
import { countActiveLiveViewers, resolveLiveChannelAccess } from "@/lib/live-room-access";
import { liveViewerCutoff } from "@/lib/live-presence";
import { parseLiveTagsInput } from "@/lib/live-categories";
import {
  filterLiveChatContent,
  looksLikeSpamDuplicate,
} from "@/lib/live-chat-filter";
import { moderateLiveChatFast } from "@/lib/ai-moderation";
import { provisionObsIngress } from "@/lib/obs-ingress-service";
import { getOrCreateUserObsStreamKey } from "@/lib/user-obs-stream-key";
import { getSrsRtmpUrl } from "@/lib/srs";
import {
  closeStaleHostLiveChannels,
  endHostBroadcastChannel,
  prepareHostForNewBroadcast,
} from "@/lib/live-broadcast/session-manager";
import { isPubliclyLive } from "@/lib/live-channel-active";
import { notifyFollowersOnLive } from "@/lib/live-notify";
import {
  fetchLiveChannelForStudio,
  fetchLiveTipsForChannel,
} from "@/lib/live-channel-meta-safe";
import { ensureStringArray } from "@/lib/ensure-array";
import { revalidatePath } from "next/cache";

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

/** 방송 시작 페이지 진입 시 — 종료됐는데 남은 isLive 플래그 정리 */
export async function releaseStaleHostLiveSessions() {
  const user = await requireAuthMinimal();
  const result = await prepareHostForNewBroadcast(user.id);
  return {
    ok: result.ok,
    released: result.ok ? result.released : [],
    error: result.ok ? undefined : result.error,
  };
}

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
  liveVisibility?: LiveVisibility;
  minViewerTier?: SupportTierLevel;
}) {
  try {
    const user = await requireAuthMinimal();
    const title = data.name?.trim() || "라이브 방송";
    const joinPassword = generateLiveJoinPassword();
    const joinPasswordHash = await hashLiveJoinPassword(joinPassword);

    const tags = Array.isArray(data.tags)
      ? data.tags.slice(0, 8)
      : typeof data.tags === "string"
        ? parseLiveTagsInput(data.tags)
        : [];

    const scheduledRaw = data.scheduledAt?.trim();
    const scheduledAt =
      scheduledRaw && scheduledRaw.length > 0 ? new Date(scheduledRaw) : null;
    const isScheduled =
      scheduledAt !== null &&
      !Number.isNaN(scheduledAt.getTime()) &&
      scheduledAt.getTime() > Date.now();

    const goalRaw =
      typeof data.donationGoalKrw === "number"
        ? data.donationGoalKrw
        : parseInt(String(data.donationGoalKrw ?? ""), 10);

    const visibility = data.liveVisibility ?? "PUBLIC";
    const minTier =
      visibility === "PRIVATE" ? (data.minViewerTier ?? "BRONZE") : null;

    if (!isScheduled) {
      const prep = await prepareHostForNewBroadcast(user.id);
      if (!prep.ok) {
        return {
          error: prep.error,
          existingChannelId: prep.blockingChannelId,
        };
      }
      await db.voiceChannel.updateMany({
        where: {
          createdBy: user.id,
          isLive: false,
          liveStatus: { in: ["SCHEDULED", "LIVE"] },
        },
        data: { isLive: false, liveStatus: "ENDED", endedAt: new Date() },
      });
    }

    const baseData = {
      name: title.slice(0, 120),
      communityId: data.communityId,
      maxUsers: Math.min(Math.max(data.maxUsers ?? 200, 2), 500),
      allowScreen: data.allowScreen ?? true,
      allowCamera: data.allowCamera ?? true,
      createdBy: user.id,
      joinPasswordHash,
      isLive: false,
      liveStatus: "SCHEDULED" as const,
      category: data.category ?? "JUST_CHATTING",
      tags,
      thumbnailUrl: data.thumbnailUrl?.trim() || null,
      description: data.description?.trim().slice(0, 500) || null,
      scheduledAt: isScheduled ? scheduledAt : null,
      donationGoalKrw: Number.isFinite(goalRaw) && goalRaw > 0 ? goalRaw : null,
      broadcastMode: data.broadcastMode ?? "BROWSER",
      members: {
        create: {
          userId: user.id,
          role: "HOST",
          lastSeenAt: new Date(),
        },
      },
    };

    let channel;
    try {
      channel = await db.voiceChannel.create({
        data: {
          ...baseData,
          liveVisibility: visibility,
          minViewerTier: minTier,
        },
      });
    } catch (visErr) {
      const msg = visErr instanceof Error ? visErr.message : "";
      if (/liveVisibility|minViewerTier|LiveVisibility/i.test(msg)) {
        channel = await db.voiceChannel.create({ data: baseData });
      } else {
        throw visErr;
      }
    }

    try {
      await db.streamerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    } catch (profileErr) {
      console.warn("[createLiveStream] streamerProfile", profileErr);
    }

    return {
      channel,
      joinPassword: isScheduled ? undefined : joinPassword,
      scheduled: isScheduled,
    };
  } catch (e) {
    console.error("[createLiveStream]", e);
    return { error: formatLiveCreateError(e) };
  }
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
      isLive: false,
      liveStatus: "SCHEDULED",
      joinPasswordHash,
      scheduledAt: null,
    },
  });
  await upsertLiveMember(channelId, user.id, "HOST");
  await db.voiceChannel.update({
    where: { id: channelId },
    data: { broadcastMode: "BROWSER" },
  });
  revalidatePath("/live");
  return { joinPassword, channelId };
}

export async function getLiveChannelRoomMeta(channelId: string, viewerId?: string | null) {
  try {
    const channel = await fetchLiveChannelForStudio(channelId);
    if (!channel) return null;

    const needFollow =
      !!viewerId && viewerId !== channel.createdBy;

    const [host, tips, followRow] = await Promise.all([
      db.user.findUnique({
        where: { id: channel.createdBy },
        select: {
          id: true,
          username: true,
          image: true,
          supportTierSent: true,
          supportTierReceived: true,
          totalSupportReceived: true,
        },
      }),
      fetchLiveTipsForChannel(channel.createdBy, channel.createdAt),
      needFollow
        ? db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId!,
                followingId: channel.createdBy,
              },
            },
            select: { followerId: true },
          })
        : Promise.resolve(null),
    ]);

    if (!host) return null;

    return {
      channel,
      host,
      tipTotalKrw: tips.tipTotalKrw,
      tipRanking: tips.tipRanking,
      hostFollowing: !!followRow,
    };
  } catch (e) {
    console.error("[getLiveChannelRoomMeta]", e);
    return null;
  }
}

/** 호스트 스튜디오 입장 — OBS 전(SCHEDULED)에도 가능 */
export async function enterLiveAsHost(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, liveStatus: true },
  });

  if (!channel) return { error: "종료되었거나 없는 방송입니다." };
  if (channel.createdBy !== user.id) {
    return { error: "호스트만 스튜디오에 입장할 수 있습니다." };
  }
  if (channel.liveStatus === "ENDED") {
    return { error: "종료된 방송입니다. 새 방송을 만들어 주세요." };
  }

  await upsertLiveMember(channelId, user.id, "HOST");
  await db.voiceChannel.update({
    where: { id: channelId },
    data: { broadcastMode: "BROWSER" },
  });
  return { success: true as const, role: "HOST" as const };
}

/** 브라우저(웹캠·화면공유) 방송 시작 — 유튜브·치지직처럼 앱 안에서 송출 */
export async function startBrowserLiveBroadcast(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, liveStatus: true, name: true, isLive: true },
  });
  if (!channel || channel.createdBy !== user.id) {
    return { error: "호스트만 방송을 시작할 수 있습니다." };
  }
  if (channel.liveStatus === "ENDED") {
    return { error: "종료된 방송입니다. 새 방송을 만들어 주세요." };
  }

  const wasLive = channel.isLive;
  await db.voiceChannel.update({
    where: { id: channelId },
    data: {
      isLive: true,
      liveStatus: "LIVE",
      broadcastMode: "BROWSER",
    },
  });

  if (!wasLive) {
    const { notifyFollowersOnLive } = await import("@/lib/live-notify");
    void notifyFollowersOnLive(user.id, channelId, channel.name).catch(() => {});
  }

  revalidatePath("/live");
  revalidatePath(`/voice/${channelId}`);
  return { success: true as const };
}

/** 시청 입장 — 공개 방송은 누구나, 비공개는 등급 충족 시청자만 (LIVE 중만) */
export async function enterLiveAsViewer(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, liveStatus: true, createdBy: true, maxUsers: true },
  });

  if (!channel) return { error: "종료되었거나 없는 방송입니다." };
  if (channel.createdBy === user.id) {
    return enterLiveAsHost(channelId);
  }
  if (
    !isPubliclyLive({
      isLive: channel.isLive,
      liveStatus: channel.liveStatus,
    })
  ) {
    return {
      error:
        channel.liveStatus === "ENDED"
          ? "종료된 방송입니다."
          : "아직 방송이 시작되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const access = await resolveLiveChannelAccess(channelId, user.id);
  if (!access.allowed) {
    if (access.reason === "TIER_REQUIRED" && access.minViewerTier) {
      return {
        error: `비공개 방송입니다. 이 스트리머에게 ${tierLabelKo(access.minViewerTier)} 등급 이상 후원이 필요합니다.`,
        code: "TIER_REQUIRED" as const,
      };
    }
    return { error: "시청할 수 없습니다." };
  }

  const active = await countActiveLiveViewers(channelId);
  if (active >= channel.maxUsers) {
    return { error: "시청 인원이 가득 찼습니다. 잠시 후 다시 시도해 주세요." };
  }

  await upsertLiveMember(channelId, user.id, "VIEWER");
  return { success: true as const, role: "VIEWER" as const };
}

/** 합방(공동 방송) 신청 — 비밀번호 일치 시에만 CO_HOST */
export async function applyLiveCollabPassword(channelId: string, password: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      isLive: true,
      joinPasswordHash: true,
      maxUsers: true,
      createdBy: true,
    },
  });

  if (!channel || !channel.isLive) return { error: "종료되었거나 없는 방송입니다." };
  if (channel.createdBy === user.id) {
    return { error: "호스트는 합방 신청이 필요 없습니다." };
  }

  if (!channel.joinPasswordHash) {
    return { error: "합방 비밀번호가 아직 설정되지 않았습니다." };
  }

  const ok = await verifyLiveJoinPassword(password, channel.joinPasswordHash);
  if (!ok) return { error: "합방 비밀번호가 일치하지 않습니다." };

  const active = await countActiveLiveViewers(channelId);
  if (active >= channel.maxUsers) {
    return { error: "시청 인원이 가득 찼습니다." };
  }

  await upsertLiveMember(channelId, user.id, "CO_HOST");
  return { success: true as const, role: "CO_HOST" as const };
}

/** @deprecated 호환 — 호스트 입장 또는 합방 비밀번호 */
export async function joinLiveStreamWithPassword(channelId: string, password: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true, liveStatus: true },
  });
  if (!channel) return { error: "종료되었거나 없는 방송입니다." };
  if (channel.createdBy === user.id) {
    return enterLiveAsHost(channelId);
  }
  if (!channel.isLive) {
    return {
      error:
        channel.liveStatus === "ENDED"
          ? "종료된 방송입니다."
          : "아직 방송이 시작되지 않았습니다.",
    };
  }
  if (!password.trim()) {
    return enterLiveAsViewer(channelId);
  }
  return applyLiveCollabPassword(channelId, password);
}

async function upsertLiveMember(
  channelId: string,
  userId: string,
  role: "HOST" | "VIEWER" | "CO_HOST"
) {
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

  await db.voiceMember.upsert({
    where: { channelId_userId: { channelId, userId: user.id } },
    create: {
      channelId,
      userId: user.id,
      role: access.isHost ? "HOST" : "VIEWER",
      lastSeenAt: new Date(),
    },
    update: { lastSeenAt: new Date() },
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

  const filtered = filterLiveChatContent(content, ensureStringArray(channel.chatBannedWords));
  if (!filtered.ok) return { error: filtered.error };
  const text = filtered.text;

  await upsertLiveMember(channelId, user.id, access.isHost ? "HOST" : "VIEWER");

  const ai = await moderateLiveChatFast(text);
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

  try {
    const msg = await db.liveChatMessage.create({
      data: { channelId, userId: user.id, content: text },
      include: {
        user: { select: userPublicSelectMinimal },
      },
    });
    return { message: mapLiveChatMessage(msg) };
  } catch (e) {
    console.error("[sendLiveChatMessage]", e);
    const msg = e instanceof Error ? e.message : "";
    if (/LiveChatMessage|does not exist|relation/i.test(msg)) {
      return {
        error:
          "채팅 DB가 준비되지 않았습니다. Supabase SQL Editor에서 supabase-fix-all.sql을 실행해 주세요.",
      };
    }
    return { error: "채팅 저장에 실패했습니다." };
  }
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
  let recentTips: {
    id: string;
    amount: number;
    message: string | null;
    username: string;
    at: number;
  }[] = [];
  try {
    const rows = await db.tip.findMany({
      where: {
        receiverId: access.hostUserId,
        createdAt: { gt: tipAfter },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { sender: { select: { username: true } } },
    });
    recentTips = rows.map((t) => ({
      id: t.id,
      amount: t.amount,
      message: t.message,
      username: t.sender.username,
      at: t.createdAt.getTime(),
    }));
  } catch (e) {
    console.warn("[getLiveStreamSync] tips", e);
  }

  return {
    viewerCount,
    isLive: channel?.isLive ?? false,
    isHost: access.isHost,
    hostUserId: access.hostUserId,
    messages: messages.map(mapLiveChatMessage),
    recentTips,
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

/** OBS Studio RTMP 송출용 URL·스트림 키 발급 */
export async function ensureObsIngress(channelId: string, force = false) {
  const user = await requireAuth();
  const result = await provisionObsIngress(channelId, user.id, { force });
  if ("error" in result) return { error: result.error };
  return {
    url: result.data.obsServer,
    streamKey: result.data.obsStreamKey,
    ingressId: result.data.ingressId,
    obsServer: result.data.obsServer,
    obsStreamKey: result.data.obsStreamKey,
  };
}

export async function setLiveBroadcastMode(channelId: string, mode: LiveBroadcastMode) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true },
  });
  if (!channel || channel.createdBy !== user.id) {
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

export async function endLiveStream(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };
  if (channel.createdBy !== user.id) return { error: "방송 종료는 호스트만 할 수 있습니다." };

  await endHostBroadcastChannel(channelId, user.id);
  await closeStaleHostLiveChannels(user.id);

  revalidatePath("/live");
  revalidatePath("/voice/new");
  revalidatePath(`/voice/${channelId}`);
  return { success: true as const };
}

export async function leaveLiveStream(channelId: string) {
  const user = await requireAuth();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true },
  });
  if (!channel) return { success: true as const };

  // 라이브 방송 중 호스트는 스튜디오 remount(OBS 탭 등)에도 멤버 유지 — 여기서 isLive 끄면 방송이 순식간에 종료됨
  if (channel.isLive && channel.createdBy === user.id) {
    return { success: true as const };
  }

  await db.voiceMember.deleteMany({
    where: { channelId, userId: user.id },
  });

  const remaining = await db.voiceMember.count({ where: { channelId } });
  if (remaining === 0 && channel.createdBy === user.id && !channel.isLive) {
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

  await upsertLiveMember(channelId, user.id, access.isHost ? "HOST" : "VIEWER");

  try {
    const messages = await db.liveChatMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { user: { select: userPublicSelectMinimal } },
    });
    return { messages: messages.reverse().map(mapLiveChatMessage) };
  } catch (e) {
    console.error("[loadLiveChatHistory]", e);
    return { error: "CHAT_DB" as const };
  }
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
