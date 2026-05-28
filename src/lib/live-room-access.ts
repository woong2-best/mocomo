import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";

export type LiveRoomAccess =
  | { allowed: true; isHost: boolean; hostUserId: string }
  | {
      allowed: false;
      reason: "NOT_FOUND" | "NOT_LIVE" | "NOT_MEMBER" | "ENDED";
    };

type ChannelAccessRow = {
  id: string;
  createdBy: string;
  isLive: boolean;
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
        linkedChatRoom: { select: { id: true, type: true } },
      },
    });
  } catch (e) {
    console.warn("[resolveLiveChannelAccess] linkedChatRoom select failed", e);
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
  if (!channel.isLive) return { allowed: false, reason: "NOT_LIVE" };

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

  const isHost = channel.createdBy === userId;
  if (isHost) return { allowed: true, isHost: true, hostUserId: channel.createdBy };

  const member = await db.voiceMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { role: true, lastSeenAt: true },
  });
  if (!member) return { allowed: false, reason: "NOT_MEMBER" };

  return { allowed: true, isHost: false, hostUserId: channel.createdBy };
}

export async function countActiveLiveViewers(channelId: string): Promise<number> {
  return db.voiceMember.count({
    where: {
      channelId,
      lastSeenAt: { gte: liveViewerCutoff() },
    },
  });
}
