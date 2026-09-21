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
    return { ok: false, error: "streamer_id가 올바르지 않습니다." };
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
    return { ok: false, error: "진행 중인 방송을 찾을 수 없습니다." };
  }

  return {
    ok: true,
    channelId: live.id,
    streamerId: live.createdBy,
    isLive: live.isLive,
    chatBannedWords: live.chatBannedWords ?? [],
  };
}
