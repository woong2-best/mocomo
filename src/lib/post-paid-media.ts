import { db } from "@/lib/db";

export type PostMediaAccessRow = {
  id: string;
  url: string;
  type: string;
  order?: number;
  priceKrw?: number;
  purchaseCount?: number;
  locked?: boolean;
};

export function isPaidMedia(priceKrw?: number | null) {
  return (priceKrw ?? 0) > 0;
}

export function isMediaUnlockedForViewer(
  viewerId: string | null | undefined,
  authorId: string,
  priceKrw?: number | null,
  purchased = false
) {
  if (!isPaidMedia(priceKrw)) return true;
  if (viewerId && viewerId === authorId) return true;
  return purchased;
}

export async function getPurchasedPostMediaIds(
  viewerId: string | null | undefined,
  mediaIds: string[]
) {
  if (!viewerId || mediaIds.length === 0) return new Set<string>();
  const rows = await db.postMediaPurchase.findMany({
    where: { buyerId: viewerId, mediaId: { in: mediaIds } },
    select: { mediaId: true },
  });
  return new Set(rows.map((r) => r.mediaId));
}

export function attachMediaAccess<T extends { authorId: string; media?: PostMediaAccessRow[] }>(
  post: T,
  viewerId: string | null | undefined,
  purchasedIds: Set<string>
): T {
  if (!post.media?.length) return post;
  return {
    ...post,
    media: post.media.map((m) => ({
      ...m,
      locked: !isMediaUnlockedForViewer(viewerId, post.authorId, m.priceKrw, purchasedIds.has(m.id)),
    })),
  };
}
