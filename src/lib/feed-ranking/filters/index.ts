import { getBoolParam, getNumericParam } from "@/lib/feed-ranking/params";
import type { FeedQuery, PostCandidate } from "@/lib/feed-ranking/types";
import type { Filter } from "@/lib/feed-ranking/pipeline/types";

/** 중복 postId 제거 — 첫 소스 우선 */
export const dedupFilter: Filter<FeedQuery, PostCandidate> = {
  id: "dedup",
  filter(_query, candidates) {
    const seen = new Set<string>();
    const kept: PostCandidate[] = [];
    const removed: PostCandidate[] = [];
    for (const c of candidates) {
      if (seen.has(c.postId)) {
        removed.push(c);
      } else {
        seen.add(c.postId);
        kept.push(c);
      }
    }
    return { kept, removed };
  },
};

/** X age filter — 오래된 포스트 제거 */
export const ageFilter: Filter<FeedQuery, PostCandidate> = {
  id: "age",
  filter(query, candidates) {
    const maxHours = getNumericParam(query.params, "MaxPostAgeHours");
    const cutoff = Date.now() - maxHours * 60 * 60 * 1000;
    const kept: PostCandidate[] = [];
    const removed: PostCandidate[] = [];
    for (const c of candidates) {
      if (c.createdAt.getTime() < cutoff) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

/** 이미 본 포스트 제거 */
export const seenFilter: Filter<FeedQuery, PostCandidate> = {
  id: "seen",
  enable: (q) => getBoolParam(q.params, "FilterSeenPosts"),
  filter(query, candidates) {
    const kept: PostCandidate[] = [];
    const removed: PostCandidate[] = [];
    for (const c of candidates) {
      if (query.seenPostIds.has(c.postId)) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

/** 차단·뮤트 작성자 제거 */
export const blockMuteFilter: Filter<FeedQuery, PostCandidate> = {
  id: "block_mute",
  enable: (q) => getBoolParam(q.params, "FilterBlockedAuthors"),
  filter(query, candidates) {
    const kept: PostCandidate[] = [];
    const removed: PostCandidate[] = [];
    for (const c of candidates) {
      if (query.blockedIds.has(c.authorId) || query.mutedIds.has(c.authorId)) {
        removed.push(c);
      } else {
        kept.push(c);
      }
    }
    return { kept, removed };
  },
};

/** 본인 포스트 제거 (옵션) */
export const selfFilter: Filter<FeedQuery, PostCandidate> = {
  id: "self",
  enable: (q) => getBoolParam(q.params, "FilterSelfPosts"),
  filter(query, candidates) {
    const kept: PostCandidate[] = [];
    const removed: PostCandidate[] = [];
    for (const c of candidates) {
      if (c.authorId === query.userId) removed.push(c);
      else kept.push(c);
    }
    return { kept, removed };
  },
};

export const PRE_SCORING_FILTERS = [
  dedupFilter,
  ageFilter,
  selfFilter,
  seenFilter,
  blockMuteFilter,
];
