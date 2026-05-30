import type { LiveStreamStatus, LiveVisibility, SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";
import { meetsPrivateLiveTier } from "@/lib/live-viewer-access";
import { isBroadcastActive } from "@/lib/live-channel-active";

export type LiveRoomAccess =
  | { allowed: true; isHost: boolean; hostUserId: string; canPublish?: boolean }
  | {
      allowed: false;
      reason: "NOT_FOUND" | "NOT_LIVE" | "NOT_MEMBER" | "ENDED" | "TIER_REQUIRED";
      minViewerTier?: SupportTierLevel;
    };

type ChannelAccessRow = {
  id: string;
  createdBy: string;
  isLive: boolean;
  liveStatus?: LiveStreamStatus;
  liveVisibility?: LiveVisibility;
  minViewerTier?: SupportTierLevel | null;
  linkedChatRoom?: { id: string; type: string } | null;
};

async function loadChannelForAccess(channelId: string): Promise<ChannelAccessRow | null> {
  try {
    return await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        createdBy: true,
        isLive: true,
        liveStatus: true,
        liveVisibility: true,
        minViewerTier: true,
        linkedChatRoom: { select: { id: true, type: true } },
      },
    });
  } catch (e) {
    console.warn("[resolveLiveChannelAccess] extended select failed", e);
    return await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: { id: true, createdBy: true, isLive: true },
    });
  }
}

export async function resolveLiveChannelAccess(
  channelId: string,
  userId: string
): Promise<LiveRoomAccess> {
  const channel = await loadChannelForAccess(channelId);
  if (!channel) return { allowed: false, reason: "NOT_FOUND" };

  const isHost = channel.createdBy === userId;
  const active = isBroadcastActive({
    isLive: channel.isLive,
    liveStatus: channel.liveStatus ?? (channel.isLive ? "LIVE" : "ENDED"),
  });

  if (!active) {
    const hostStudio =
      isHost &&
      channel.liveStatus !== "ENDED" &&
      (channel.liveStatus === "LIVE" || channel.liveStatus === "SCHEDULED");
    if (hostStudio) {
      return {
        allowed: true,
        isHost: true,
        hostUserId: channel.createdBy,
        canPublish: true,
      };
    }
    return { allowed: false, reason: isHost ? "ENDED" : "NOT_LIVE" };
  }

  const linked = channel.linkedChatRoom ?? null;
  const isGroupSocialCall = linked?.type === "SOCIAL_GROUP";

  if (isGroupSocialCall && linked) {
    try {
      const chatMember = await db.chatMember.findUnique({
        where: {
          roomId_userId: { roomId: linked.id, userId },
        },
      });
      if (!chatMember) return { allowed: false, reason: "NOT_MEMBER" };
      return {
        allowed: true,
        isHost: true,
        hostUserId: channel.createdBy,
      };
    } catch (e) {
      console.warn("[resolveLiveChannelAccess] chat member check failed", e);
    }
  }

  if (isHost) {
    return { allowed: true, isHost: true, hostUserId: channel.createdBy, canPublish: true };
  }

  const member = await db.voiceMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { role: true, lastSeenAt: true },
  });
  const isCollab = member?.role === "CO_HOST";

  const visibility = channel.liveVisibility ?? "PUBLIC";
  if (visibility === "PRIVATE") {
    const minTier = channel.minViewerTier ?? "BRONZE";
    const ok = await meetsPrivateLiveTier(userId, channel.createdBy, minTier);
    if (!ok) {
      return { allowed: false, reason: "TIER_REQUIRED", minViewerTier: minTier };
    }
  }

  return {
    allowed: true,
    isHost: false,
    hostUserId: channel.createdBy,
    canPublish: isCollab,
  };
}

export async function countActiveLiveViewers(channelId: string): Promise<number> {
  return db.voiceMember.count({
    where: {
      channelId,
      lastSeenAt: { gte: liveViewerCutoff() },
    },
  });
}
