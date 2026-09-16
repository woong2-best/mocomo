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

/** X age filter — SoftAgeFilter 시 후보 부족하면 오래된 포스트도 재투입 */
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

    if (
      getBoolParam(query.params, "SoftAgeFilter") &&
      kept.length < getNumericParam(query.params, "FallbackMinCandidates")
    ) {
      const need = getNumericParam(query.params, "FallbackMinCandidates") - kept.length;
      const revive = [...removed].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      for (const c of revive.slice(0, need)) {
        kept.push(c);
      }
      const revived = new Set(kept.map((c) => c.postId));
      return {
        kept,
        removed: removed.filter((c) => !revived.has(c.postId)),
      };
    }

    return { kept, removed };
  },
};

/**
 * SeenFilter (soft) —
 * - SeenSoftFilter: 최근 SeenReexposeAfterHours(기본 24h) 이내만 hard-exclude
 * - 그 이전 시청분은 재노출 허용
 * - 그래도 FallbackMinCandidates 미달이면 최근 본 영상까지 순환(loop) 투입
 */
export const seenFilter: Filter<FeedQuery, PostCandidate> = {
  id: "seen",
  enable: (q) => getBoolParam(q.params, "FilterSeenPosts"),
  filter(query, candidates) {
    const soft = getBoolParam(query.params, "SeenSoftFilter");
    const reexposeHours = getNumericParam(query.params, "SeenReexposeAfterHours");
    const reexposeMs = Math.max(0, reexposeHours) * 60 * 60 * 1000;
    const now = Date.now();
    const minKeep = getNumericParam(query.params, "FallbackMinCandidates");

    const kept: PostCandidate[] = [];
    const softRemoved: PostCandidate[] = [];
    const hardRemoved: PostCandidate[] = [];

    for (const c of candidates) {
      if (!query.seenPostIds.has(c.postId)) {
        kept.push(c);
        continue;
      }

      if (!soft) {
        hardRemoved.push(c);
        continue;
      }

      const lastAt = query.seenPostAt.get(c.postId) ?? 0;
      const age = now - lastAt;
      if (age >= reexposeMs) {
        // 24h+ 경과 → 재노출 허용 (점수는 scorer에서 낮게 유지)
        kept.push(c);
      } else {
        softRemoved.push(c);
      }
    }

    if (soft && kept.length < minKeep && softRemoved.length) {
      const need = minKeep - kept.length;
      const oldestFirst = [...softRemoved].sort((a, b) => {
        const aAt = query.seenPostAt.get(a.postId) ?? 0;
        const bAt = query.seenPostAt.get(b.postId) ?? 0;
        return aAt - bAt;
      });
      const revived = oldestFirst.slice(0, need);
      const revivedIds = new Set(revived.map((c) => c.postId));
      kept.push(...revived);
      return {
        kept,
        removed: softRemoved.filter((c) => !revivedIds.has(c.postId)),
      };
    }

    return { kept, removed: [...softRemoved, ...hardRemoved] };
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
