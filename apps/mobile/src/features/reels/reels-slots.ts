import type { FeedAd } from "@/api/feed";
import type { FeedVideoGroup } from "@/features/feed/feed-video-groups";

export type ReelsSlot =
  | { kind: "reel"; key: string; group: FeedVideoGroup }
  | { kind: "ad"; key: string; ad: FeedAd };

const REELS_PER_AD = 4;
const MIN_REELS_BEFORE_FIRST_AD = 2;

/** Instagram-style: sponsored full-screen slides between reels. */
export function buildReelsSlots(groups: FeedVideoGroup[], ads: FeedAd[]): ReelsSlot[] {
  if (ads.length === 0) {
    return groups.map((group) => ({
      kind: "reel" as const,
      key: group.postId,
      group,
    }));
  }

  const out: ReelsSlot[] = [];
  let adIndex = 0;
  let sinceAd = 0;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    out.push({ kind: "reel", key: group.postId, group });
    sinceAd += 1;

    const canInsert =
      out.filter((s) => s.kind === "reel").length >= MIN_REELS_BEFORE_FIRST_AD &&
      sinceAd >= REELS_PER_AD &&
      i < groups.length - 1;

    if (canInsert) {
      const ad = ads[adIndex % ads.length]!;
      out.push({
        kind: "ad",
        key: `ad-${adIndex}-${ad.id}`,
        ad,
      });
      adIndex += 1;
      sinceAd = 0;
    }
  }

  return out;
}

export function findReelSlotIndex(slots: ReelsSlot[], postId: string): number {
  return slots.findIndex((s) => s.kind === "reel" && s.group.postId === postId);
}
