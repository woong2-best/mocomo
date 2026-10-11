import type { FeedAd } from "@/api/feed";
import type { FeedVideoGroup } from "@/features/feed/feed-video-groups";

export type ReelsSlot =
  | { kind: "reel"; key: string; group: FeedVideoGroup }
  | { kind: "ad"; key: string; ad: FeedAd };

const REELS_PER_AD = 4;
const MIN_REELS_BEFORE_FIRST_AD = 2;

/** Stable identity — ad keys must not include insertion index (that shifts when ads load). */
export function reelsSlotIdentity(slot: ReelsSlot): string {
  return slot.kind === "reel" ? `reel:${slot.group.postId}` : `ad:${slot.ad.id}`;
}

export function findSlotIndexByIdentity(slots: ReelsSlot[], identity: string): number {
  return slots.findIndex((s) => reelsSlotIdentity(s) === identity);
}

function adsForReels(groups: FeedVideoGroup[], ads: FeedAd[]): FeedAd[] {
  const occupiedPostIds = new Set(groups.map((g) => g.postId));
  const unique: FeedAd[] = [];
  const seen = new Set<string>();
  for (const ad of ads) {
    const postId = ad.postId?.trim();
    if (postId && occupiedPostIds.has(postId)) continue;
    if (seen.has(ad.id)) continue;
    seen.add(ad.id);
    unique.push(ad);
  }
  return unique;
}

/** Instagram-style: sponsored full-screen slides between reels. */
export function buildReelsSlots(groups: FeedVideoGroup[], ads: FeedAd[]): ReelsSlot[] {
  const uniqueAds = adsForReels(groups, ads);
  if (uniqueAds.length === 0) {
    return groups.map((group) => ({
      kind: "reel" as const,
      key: group.postId,
      group,
    }));
  }

  const out: ReelsSlot[] = [];
  let adIndex = 0;
  let sinceAd = 0;
  let reelCount = 0;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    out.push({ kind: "reel", key: group.postId, group });
    sinceAd += 1;
    reelCount += 1;

    const canInsert =
      reelCount >= MIN_REELS_BEFORE_FIRST_AD &&
      sinceAd >= REELS_PER_AD &&
      i < groups.length - 1 &&
      adIndex < uniqueAds.length;

    if (canInsert) {
      const ad = uniqueAds[adIndex]!;
      out.push({
        kind: "ad",
        key: `ad-${ad.id}`,
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
