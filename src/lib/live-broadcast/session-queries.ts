import type { Prisma } from "@prisma/client";

/** OBS/라이브 허브 방송 — 친목 단체 통화 VoiceChannel 제외 */
export function hostBroadcastChannelWhere(hostUserId: string): Prisma.VoiceChannelWhereInput {
  return {
    createdBy: hostUserId,
    OR: [
      { linkedChatRoom: null },
      { linkedChatRoom: { is: { type: { not: "SOCIAL_GROUP" } } } },
    ],
  };
}

/** 진행 중으로 간주하는 방송 슬롯 (종료 누락·단체방 오탐 방지) */
export function activeHostBroadcastWhere(hostUserId: string): Prisma.VoiceChannelWhereInput {
  return {
    ...hostBroadcastChannelWhere(hostUserId),
    isLive: true,
    liveStatus: { in: ["LIVE", "SCHEDULED"] },
  };
}

export function liveHostBroadcastWhere(hostUserId: string): Prisma.VoiceChannelWhereInput {
  return {
    ...hostBroadcastChannelWhere(hostUserId),
    isLive: true,
    liveStatus: "LIVE",
  };
}

export const hostBroadcastSelect = {
  id: true,
  name: true,
  isLive: true,
  liveStatus: true,
  createdAt: true,
  endedAt: true,
  broadcastMode: true,
  category: true,
} as const;
