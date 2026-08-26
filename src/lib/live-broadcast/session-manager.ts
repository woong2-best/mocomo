import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";
import { autoEndExternalPlatformOffForHost } from "@/lib/live-external/sync-platform-end";
import {
  hostBroadcastChannelWhere,
  hostBroadcastSelect,
  liveHostBroadcastWhere,
} from "@/lib/live-broadcast/session-queries";
import { resolveBroadcastPhase, SESSION_END_DATA } from "@/lib/live-broadcast/session-lifecycle";
import { teardownObsIngress } from "@/lib/obs-ingress-service";
import { relayLiveEndedToSocket } from "@/lib/live-end-socket-relay";
import type {
  HostBroadcastSession,
  PrepareBroadcastResult,
  SessionReleaseReason,
} from "@/lib/live-broadcast/types";

const HOST_STUDIO_ABSENT_MS = 60_000;

function logSession(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test") return;
  console.info(`[live-broadcast] ${event}`, payload);
}

async function channelPresence(channelId: string, hostUserId: string) {
  const hostCutoff = new Date(Date.now() - HOST_STUDIO_ABSENT_MS);
  const [hostSeen, activeViewers] = await Promise.all([
    db.voiceMember.findFirst({
      where: { channelId, userId: hostUserId, lastSeenAt: { gte: hostCutoff } },
      select: { userId: true },
    }),
    db.voiceMember.count({
      where: { channelId, lastSeenAt: { gte: liveViewerCutoff() } },
    }),
  ]);
  return {
    hostRecentlyPresent: !!hostSeen,
    hasActiveViewers: activeViewers > 0,
  };
}

export async function listHostBroadcastSessions(
  hostUserId: string
): Promise<HostBroadcastSession[]> {
  const rows = await db.voiceChannel.findMany({
    where: {
      ...hostBroadcastChannelWhere(hostUserId),
      OR: [{ isLive: true }, { liveStatus: { in: ["LIVE", "SCHEDULED"] } }],
    },
    select: hostBroadcastSelect,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const sessions: HostBroadcastSession[] = [];
  for (const row of rows) {
    const presence = row.isLive
      ? await channelPresence(row.id, hostUserId)
      : { hostRecentlyPresent: false, hasActiveViewers: false };
    sessions.push({
      channelId: row.id,
      name: row.name,
      phase: resolveBroadcastPhase(row.isLive, row.liveStatus, row.endedAt),
      isLive: row.isLive,
      liveStatus: row.liveStatus,
      createdAt: row.createdAt,
      endedAt: row.endedAt,
      broadcastMode: row.broadcastMode,
      ...presence,
    });
  }
  return sessions;
}

/** 단일 방송 채널 종료 */
export async function releaseBroadcastSession(
  channelId: string,
  hostUserId: string,
  reason: SessionReleaseReason
): Promise<boolean> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, name: true, rtmpIngressId: true },
  });
  if (!channel || channel.createdBy !== hostUserId) return false;

  const ingressId = channel.rtmpIngressId;

  await db.voiceChannel.update({
    where: { id: channelId },
    data: SESSION_END_DATA,
  });
  await db.voiceMember.deleteMany({ where: { channelId } });

  void teardownObsIngress(ingressId).catch((err) => {
    console.warn("[live-broadcast] ingress teardown failed", { channelId, err });
  });

  void relayLiveEndedToSocket(channelId);

  logSession("release", { channelId, hostUserId, reason, name: channel.name });
  return true;
}

/** 호스트의 모든 라이브·고아 슬롯 일괄 해제 (트위치식 1계정 1방송) */
export async function releaseAllHostBroadcastSessions(
  hostUserId: string,
  reason: SessionReleaseReason
): Promise<{ channelId: string; name: string }[]> {
  const released: { channelId: string; name: string }[] = [];

  await db.voiceChannel.updateMany({
    where: {
      createdBy: hostUserId,
      isLive: true,
      OR: [{ liveStatus: "ENDED" }, { endedAt: { not: null } }],
    },
    data: SESSION_END_DATA,
  });

  const active = await db.voiceChannel.findMany({
    where: {
      ...hostBroadcastChannelWhere(hostUserId),
      isLive: true,
      liveStatus: { in: ["LIVE", "ENDED"] },
    },
    select: hostBroadcastSelect,
    orderBy: { createdAt: "desc" },
  });

  for (const ch of active) {
    if (ch.liveStatus === "SCHEDULED") continue;

    const { hostRecentlyPresent, hasActiveViewers } = await channelPresence(ch.id, hostUserId);

    const shouldForce =
      reason === "AUTO_REPLACE" ||
      reason === "HOST_PREPARE" ||
      reason === "HOST_END" ||
      reason === "ADMIN_FORCE" ||
      !hostRecentlyPresent ||
      ch.liveStatus === "ENDED" ||
      !!ch.endedAt ||
      resolveBroadcastPhase(ch.isLive, ch.liveStatus, ch.endedAt) === "ORPHAN";

    if (!shouldForce && hasActiveViewers && hostRecentlyPresent) {
      continue;
    }

    await db.voiceChannel.update({
      where: { id: ch.id },
      data: SESSION_END_DATA,
    });
    await db.voiceMember.deleteMany({ where: { channelId: ch.id } });
    released.push({ channelId: ch.id, name: ch.name });
    logSession("release-all", { channelId: ch.id, hostUserId, reason });
  }

  const strayLive = await db.voiceChannel.findMany({
    where: liveHostBroadcastWhere(hostUserId),
    select: hostBroadcastSelect,
  });
  for (const ch of strayLive) {
    if (released.some((r) => r.channelId === ch.id)) continue;
    await db.voiceChannel.update({ where: { id: ch.id }, data: SESSION_END_DATA });
    await db.voiceMember.deleteMany({ where: { channelId: ch.id } });
    released.push({ channelId: ch.id, name: ch.name });
  }

  return released;
}

/**
 * 새 방송 생성 전 — 반드시 호출.
 * 기존 LIVE 슬롯을 자동 종료하고(트위치/치지직 정책), 정말 시청자가 있는 라이브만 차단.
 */
export async function prepareHostForNewBroadcast(
  hostUserId: string
): Promise<PrepareBroadcastResult> {
  await autoEndExternalPlatformOffForHost(hostUserId);

  const released = await releaseAllHostBroadcastSessions(hostUserId, "HOST_PREPARE");

  const blocking = await db.voiceChannel.findFirst({
    where: liveHostBroadcastWhere(hostUserId),
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  if (blocking) {
    const presence = await channelPresence(blocking.id, hostUserId);
    if (presence.hasActiveViewers && presence.hostRecentlyPresent) {
      return {
        ok: false,
        error: `시청자가 있는 방송이 진행 중입니다(${blocking.name}). /voice/${blocking.id} 에서 먼저 「방송 종료」를 눌러 주세요.`,
        blockingChannelId: blocking.id,
      };
    }
    await releaseBroadcastSession(blocking.id, hostUserId, "AUTO_REPLACE");
    released.push({ channelId: blocking.id, name: blocking.name });
  }

  return {
    ok: true,
    released: released.map((r) => ({
      channelId: r.channelId,
      name: r.name,
      reason: "HOST_PREPARE" as const,
    })),
  };
}

/** 레거시 호환 */
export async function closeStaleHostLiveChannels(hostUserId: string) {
  await releaseAllHostBroadcastSessions(hostUserId, "AUTO_STALE");
}

export async function findBlockingHostBroadcast(hostUserId: string) {
  await closeStaleHostLiveChannels(hostUserId);
  return db.voiceChannel.findFirst({
    where: liveHostBroadcastWhere(hostUserId),
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function endHostBroadcastChannel(channelId: string, hostUserId: string) {
  return releaseBroadcastSession(channelId, hostUserId, "HOST_END");
}
