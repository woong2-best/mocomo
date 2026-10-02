import { db } from "@/lib/db";
import { liveHostBroadcastWhere } from "@/lib/live-broadcast/session-queries";

export type ResolvedStreamerTarget =
  | {
      ok: true;
      channelId: string;
      streamerId: string;
      isLive: boolean;
      chatBannedWords: string[];
    }
  | { ok: false; error: string };

/** streamer_id = VoiceChannel id 또는 호스트 User id */
export async function resolveStreamerTarget(streamerIdRaw: string): Promise<ResolvedStreamerTarget> {
  const streamerId = streamerIdRaw.trim();
  if (!streamerId || streamerId.length > 64) {
    return { ok: false, error: "streamer_id is invalid." };
  }

  const byChannel = await db.voiceChannel.findUnique({
    where: { id: streamerId },
    select: {
      id: true,
      createdBy: true,
      isLive: true,
      chatBannedWords: true,
    },
  });
  if (byChannel) {
    return {
      ok: true,
      channelId: byChannel.id,
      streamerId: byChannel.createdBy,
      isLive: byChannel.isLive,
      chatBannedWords: byChannel.chatBannedWords ?? [],
    };
  }

  const live = await db.voiceChannel.findFirst({
    where: liveHostBroadcastWhere(streamerId),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdBy: true,
      isLive: true,
      chatBannedWords: true,
    },
  });
  if (!live) {
    return { ok: false, error: "No live stream in progress was found." };
  }

  return {
    ok: true,
    channelId: live.id,
    streamerId: live.createdBy,
    isLive: live.isLive,
    chatBannedWords: live.chatBannedWords ?? [],
  };
}
