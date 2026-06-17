/** 홈·API 무한 스크롤 피드 (unstable_cache) */
export const FEED_POSTS_CACHE_TAG = "feed-posts";

export function profileUserCacheTag(username: string) {
  return `profile-user:${username}`;
}
