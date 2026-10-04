import { db } from "@/lib/db";
import { releaseBroadcastSession } from "@/lib/live-broadcast/session-manager";

/** Host must come back within this window or the stream is treated as ended. */
export function videoDonationDisconnectGraceMs(): number {
  const raw = Number(process.env.VIDEO_DONATION_DISCONNECT_GRACE_MS);
  if (Number.isFinite(raw) && raw >= 30_000 && raw <= 30 * 60_000) return Math.floor(raw);
  return 3 * 60_000;
}

const closing = new Set<string>();

/** If the host heartbeat is older than the grace window, end the stream and settle/refund video donations. */
export async function closeChannelIfHostGone(channelId: string): Promise<boolean> {
  if (closing.has(channelId)) return false;
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { id: true, createdBy: true, createdAt: true, isLive: true, liveStatus: true },
  });
  if (!channel || !channel.isLive || channel.liveStatus !== "LIVE") return false;

  const host = await db.voiceMember.findUnique({
    where: { channelId_userId: { channelId, userId: channel.createdBy } },
    select: { lastSeenAt: true },
  });
  const seen = host?.lastSeenAt ?? channel.createdAt;
  if (seen.getTime() >= Date.now() - videoDonationDisconnectGraceMs()) return false;

  closing.add(channelId);
  try {
    return await releaseBroadcastSession(channel.id, channel.createdBy, "AUTO_STALE");
  } finally {
    closing.delete(channelId);
  }
}

export async function sweepDisconnectedLiveHosts(): Promise<number> {
  const live = await db.voiceChannel.findMany({
    where: { isLive: true, liveStatus: "LIVE" },
    select: { id: true },
    take: 200,
  });
  let ended = 0;
  for (const row of live) {
    if (await closeChannelIfHostGone(row.id)) ended += 1;
  }
  return ended;
}
