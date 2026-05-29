import { unstable_cache } from "next/cache";
import { fetchLiveTipsForChannel } from "@/lib/live-channel-meta-safe";

/** 방송별 후원 합계·TOP — stats API·SSR 공용 (짧은 TTL) */
export function getCachedLiveTipsForChannel(hostUserId: string, since: Date) {
  const sinceKey = since.toISOString();
  return unstable_cache(
    () => fetchLiveTipsForChannel(hostUserId, since),
    ["live-tips-v1", hostUserId, sinceKey],
    { revalidate: 10 }
  )();
}
