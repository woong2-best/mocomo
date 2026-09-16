import { getBoolParam, getNumericParam } from "@/lib/feed-ranking/params";
import type { FeedBucket, FeedQuery, PostCandidate } from "@/lib/feed-ranking/types";
import type { Selector } from "@/lib/feed-ranking/pipeline/types";

/**
 * Heavy Ranking 정렬만 수행 — 점수 임계값으로 Drop 하지 않음.
 * score=0 후보도 끝에 붙어 limit까지 채움.
 */
function sortByScoreKeepAll(candidates: PostCandidate[]): PostCandidate[] {
  return [...candidates].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    // tie-break: newer first so zero-score items still have stable order
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/** X TopKScoreSelector — 점수순 상위 K (저점수 제거 없음) */
export const topKSelector: Selector<FeedQuery, PostCandidate> = {
  id: "top_k",
  select(query, candidates) {
    const limit = getNumericParam(query.params, "FinalSelectLimit");
    const sorted = sortByScoreKeepAll(candidates);
    return {
      selected: sorted.slice(0, limit),
      non_selected: sorted.slice(limit),
    };
  },
};

const BUCKET_QUOTAS: { bucket: FeedBucket; ratio: number }[] = [
  { bucket: "IN_NETWORK", ratio: 0.35 },
  { bucket: "TRENDING", ratio: 0.25 },
  { bucket: "INTEREST", ratio: 0.2 },
  { bucket: "DISCOVERY", ratio: 0.2 },
];

/**
 * X VMRanker / BlenderSelector 경량 버전 —
 * 버킷별 쿼터 + 작성자 다양성 감쇠.
 * effectiveScore로 Drop 하지 않으며, 부족분은 score=0 포함 전원으로 채움.
 */
export const diversifySelector: Selector<FeedQuery, PostCandidate> = {
  id: "diversify",
  enable: (q) => getBoolParam(q.params, "EnableAuthorDiversity"),
  select(query, candidates) {
    const limit = getNumericParam(query.params, "FinalSelectLimit");
    const decay = getNumericParam(query.params, "AuthorDiversityDecay");

    const sorted = sortByScoreKeepAll(candidates);
    const byBucket = new Map<FeedBucket, PostCandidate[]>();
    for (const c of sorted) {
      const arr = byBucket.get(c.bucket) ?? [];
      arr.push(c);
      byBucket.set(c.bucket, arr);
    }

    const picked: PostCandidate[] = [];
    const usedPosts = new Set<string>();
    const authorCounts = new Map<string, number>();

    for (const { bucket, ratio } of BUCKET_QUOTAS) {
      const need = Math.max(1, Math.floor(limit * ratio));
      const pool = byBucket.get(bucket) ?? [];
      let bucketCount = 0;

      for (const c of pool) {
        if (picked.length >= limit || bucketCount >= need) break;
        if (usedPosts.has(c.postId)) continue;

        const authorCount = authorCounts.get(c.authorId) ?? 0;
        const diversityPenalty = authorCount > 0 ? Math.pow(decay, authorCount) : 1;
        // 감쇠는 정렬·표시용 점수만 조정 — 후보는 절대 Drop 하지 않음
        const effectiveScore = c.score * diversityPenalty;

        picked.push({ ...c, score: effectiveScore });
        usedPosts.add(c.postId);
        authorCounts.set(c.authorId, authorCount + 1);
        bucketCount += 1;
      }
    }

    // MIXED(fallback) 및 미할당 버킷 + 잔여 후보로 limit까지 채움 (score 0 포함)
    for (const c of sorted) {
      if (picked.length >= limit) break;
      if (usedPosts.has(c.postId)) continue;
      picked.push(c);
      usedPosts.add(c.postId);
    }

    const selectedIds = new Set(picked.map((p) => p.postId));
    return {
      selected: picked,
      non_selected: sorted.filter((c) => !selectedIds.has(c.postId)),
    };
  },
};

/** 기본 셀렉터 — 다양성 활성 시 diversify, 아니면 topK */
export const feedSelector: Selector<FeedQuery, PostCandidate> = {
  id: "feed_selector",
  select(query, candidates) {
    if (getBoolParam(query.params, "EnableAuthorDiversity")) {
      return diversifySelector.select(query, candidates);
    }
    return topKSelector.select(query, candidates);
  },
};
