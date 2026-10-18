/** Instagram-style comment ranking for feed posts and reels only (not QnA). */

export const RANKED_TOP_COUNT = 12;
export const RANKED_CANDIDATE_LIMIT = 60;

export type CommentRankInput = {
  likeCount: number;
  replyCount: number;
  likedByAuthor: boolean;
  authorReplied: boolean;
  followedAuthor: boolean;
  createdAtMs: number;
  nowMs?: number;
};

export function commentIsPromoted(input: CommentRankInput): boolean {
  return (
    input.likeCount > 0 ||
    input.replyCount > 0 ||
    input.likedByAuthor ||
    input.authorReplied ||
    input.followedAuthor
  );
}

/** Higher is more relevant. Recency is a mild tie-breaker, not the main axis. */
export function commentRankScore(input: CommentRankInput): number {
  const now = input.nowMs ?? Date.now();
  const ageHours = Math.max(0, (now - input.createdAtMs) / 3_600_000);
  const recency = 14 / (1 + ageHours / 20);
  return (
    input.likeCount * 4 +
    input.replyCount * 6 +
    (input.likedByAuthor ? 28 : 0) +
    (input.authorReplied ? 36 : 0) +
    (input.followedAuthor ? 20 : 0) +
    recency
  );
}

export function pickRankedTopIds<T extends { id: string }>(
  rows: T[],
  scoreOf: (row: T) => CommentRankInput,
  limit = RANKED_TOP_COUNT
): string[] {
  const ranked = rows
    .map((row) => {
      const input = scoreOf(row);
      return { id: row.id, input, score: commentRankScore(input) };
    })
    .filter((row) => commentIsPromoted(row.input))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    });
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row.id);
    if (out.length >= limit) break;
  }
  return out;
}

export function usesFeedCommentRanking(communityId: string | null | undefined): boolean {
  return !communityId;
}
