import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";

export type LiveRoomAccess =
  | { allowed: true; isHost: boolean; hostUserId: string }
  | {
      allowed: false;
      reason: "NOT_FOUND" | "NOT_LIVE" | "NOT_MEMBER" | "ENDED";
    };

export async function resolveLiveChannelAccess(
  channelId: string,
  userId: string
): Promise<LiveRoomAccess> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { id: true, createdBy: true, isLive: true },
  });
  if (!channel) return { allowed: false, reason: "NOT_FOUND" };
  if (!channel.isLive) return { allowed: false, reason: "NOT_LIVE" };

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
