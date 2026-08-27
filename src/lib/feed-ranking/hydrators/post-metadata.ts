import { db } from "@/lib/db";
import type { FeedQuery, PostCandidate } from "@/lib/feed-ranking/types";
import type { Hydrator } from "@/lib/feed-ranking/pipeline/types";

/** X CandidateHydrators — 태그·메타데이터 보강 */
export const postMetadataHydrator: Hydrator<FeedQuery, PostCandidate> = {
  id: "post_metadata",
  async hydrate(_query, candidates) {
    if (!candidates.length) return candidates;

    const postIds = candidates.map((c) => c.postId);
    const tagRows = await db.postTag.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true, tagId: true },
    });

    const tagsByPost = new Map<string, string[]>();
    for (const row of tagRows) {
      const arr = tagsByPost.get(row.postId) ?? [];
      arr.push(row.tagId);
      tagsByPost.set(row.postId, arr);
    }

    return candidates.map((c) => ({
      ...c,
      tagIds: tagsByPost.get(c.postId) ?? c.tagIds,
    }));
  },
};
