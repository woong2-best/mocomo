import { unstable_cache } from "next/cache";
import { getLiveChannelRoomMeta } from "@/actions/live-stream";

/** 방송 스튜디오 SSR 메타 — 짧은 TTL로 DB 부하 완화 (클라이언트 stats 폴링이 갱신) */
export function getCachedLiveRoomMeta(channelId: string, viewerId?: string | null) {
  const viewerKey = viewerId ?? "anon";
  return unstable_cache(
    () => getLiveChannelRoomMeta(channelId, viewerId),
    ["live-room-meta-v1", channelId, viewerKey],
    { revalidate: 8, tags: [`live-room-${channelId}`] }
  )();
}

export function liveRoomCacheTag(channelId: string) {
  return `live-room-${channelId}`;
}
