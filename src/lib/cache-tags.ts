/** 홈·API 무한 스크롤 피드 (unstable_cache) */
export const FEED_POSTS_CACHE_TAG = "feed-posts";

/** 커뮤니티 허브 목록 (unstable_cache) */
export const COMMUNITIES_LIST_CACHE_TAG = "communities-list";

export function profileUserCacheTag(username: string) {
  return `profile-user:${username}`;
}
