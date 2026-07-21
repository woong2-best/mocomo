import type { RecommendationBucket } from "@prisma/client";
import type { ScoredCandidate } from "@/lib/follow-recommendations/types";

/** 14. 다양성 — 버킷별 비율로 섞어 동일 유형만 반복되지 않게 함 */
const BUCKET_QUOTAS: { bucket: RecommendationBucket; ratio: number }[] = [
  { bucket: "COMMON_FOLLOW", ratio: 0.3 },
  { bucket: "INTEREST", ratio: 0.25 },
  { bucket: "POPULAR", ratio: 0.2 },
  { bucket: "NEW", ratio: 0.15 },
  { bucket: "INTERACTION", ratio: 0.1 },
];

function primaryBucket(reasons: ScoredCandidate["reasons"]): RecommendationBucket {
  if (!reasons.length) return "MIXED";
  const top = [...reasons].sort((a, b) => b.score - a.score)[0];
  switch (top.signalId) {
    case "common_follow":
      return "COMMON_FOLLOW";
    case "interest":
    case "tag":
    case "search":
      return "INTEREST";
    case "community":
      return "COMMUNITY";
    case "popularity":
    case "growth":
    case "activity":
      return "POPULAR";
    case "new_user_boost":
      return "NEW";
    case "interaction":
    case "profile_visit":
    case "post_view":
    case "video_watch":
    case "live_watch":
      return "INTERACTION";
    default:
      return "MIXED";
  }
}

export function assignBuckets(candidates: ScoredCandidate[]): ScoredCandidate[] {
  return candidates.map((c) => ({
    ...c,
    bucket: primaryBucket(c.reasons),
  }));
}

export function diversifyRecommendations(
  scored: ScoredCandidate[],
  limit: number
): ScoredCandidate[] {
  const withBuckets = assignBuckets(scored).sort((a, b) => b.score - a.score);
  const byBucket = new Map<RecommendationBucket, ScoredCandidate[]>();
  for (const c of withBuckets) {
    const arr = byBucket.get(c.bucket) ?? [];
    arr.push(c);
    byBucket.set(c.bucket, arr);
  }

  const picked: ScoredCandidate[] = [];
  const used = new Set<string>();

  for (const { bucket, ratio } of BUCKET_QUOTAS) {
    const need = Math.max(1, Math.floor(limit * ratio));
    const pool = byBucket.get(bucket) ?? [];
    for (const c of pool) {
      if (picked.length >= limit) break;
      if (used.has(c.candidateId)) continue;
      picked.push(c);
      used.add(c.candidateId);
      if ([...picked].filter((p) => p.bucket === bucket).length >= need) break;
    }
  }

  // 남은 자리는 점수순으로 채움
  for (const c of withBuckets) {
    if (picked.length >= limit) break;
    if (used.has(c.candidateId)) continue;
    picked.push(c);
    used.add(c.candidateId);
  }

  return picked.map((c, i) => ({ ...c, /* rank applied later */ score: c.score })).slice(0, limit);
}
