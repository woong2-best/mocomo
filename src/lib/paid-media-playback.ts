import type { ContentVisibility } from "@prisma/client";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  getSubscriptionsForViewer,
  isMediaContentLocked,
} from "@/lib/content-access";

export const PAID_MEDIA_PLAYBACK_PREFIX = "/api/media/paid";

export type WatermarkContentKind = "POST_MEDIA" | "EPISODE";

export function paidMediaPlaybackPath(mediaId: string): string {
  return `${PAID_MEDIA_PLAYBACK_PREFIX}/${encodeURIComponent(mediaId)}`;
}

export function paidEpisodePlaybackPath(episodeId: string): string {
  return `${PAID_MEDIA_PLAYBACK_PREFIX}/episode/${encodeURIComponent(episodeId)}`;
}

export function isPaidPlaybackPath(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith(PAID_MEDIA_PLAYBACK_PREFIX));
}

/**
 * Replace the stored CDN URL so the browser never sees the origin bytes of a
 * paid video. Locked media get an empty src (paywall). Unlocked media play
 * through a same-origin gate that checks entitlement on every Range request.
 *
 * HLS is omitted for paid video: the forensic canvas needs a progressive
 * element, and a public manifest would leak segment URLs.
 */
export function rewritePaidVideoSrc(input: {
  id: string;
  url: string;
  type: string;
  priceKrw?: number | null;
  locked?: boolean;
  hlsUrl?: string | null;
}): { url: string; hlsUrl: string | null } {
  if (input.type !== "VIDEO" || (input.priceKrw ?? 0) <= 0) {
    return { url: input.url, hlsUrl: input.hlsUrl ?? null };
  }
  if (input.locked) return { url: "", hlsUrl: null };
  return { url: paidMediaPlaybackPath(input.id), hlsUrl: null };
}

export function rewritePaidEpisodeVideoUrl(input: {
  episodeId: string;
  videoUrl: string | null;
  price: number;
  locked: boolean;
}): string | null {
  if (!input.videoUrl) return null;
  if (input.price <= 0) return input.videoUrl;
  if (input.locked) return null;
  return paidEpisodePlaybackPath(input.episodeId);
}

type WebMediaRow = {
  id: string;
  url: string;
  type: string;
  priceKrw?: number | null;
  hlsUrl?: string | null;
  locked?: boolean;
};

/**
 * Per-viewer lock + origin-URL stripping for web feed/detail payloads.
 * Mobile feed is left alone — native players use the stored CDN URL.
 */
export async function attachWebPaidMediaPlayback<
  T extends {
    authorId?: string;
    author?: { id: string };
    visibility?: ContentVisibility;
    instantPurchasePriceKrw?: number | null;
    media?: WebMediaRow[];
  },
>(posts: T[], viewerId: string | null): Promise<T[]> {
  if (posts.length === 0) return posts;

  const mediaIds = posts.flatMap((p) => p.media?.map((m) => m.id) ?? []);
  const authorIds = [
    ...new Set(
      posts
        .map((p) => p.authorId ?? p.author?.id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [purchasedIds, subscriptions] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, authorIds),
  ]);

  return posts.map((post) => {
    const authorId = post.authorId ?? post.author?.id;
    if (!authorId || !post.media?.length) return post;
    const visibility = post.visibility ?? "PUBLIC";
    const subscription = subscriptions.get(authorId) ?? null;

    return {
      ...post,
      media: post.media.map((m) => {
        const { locked, lockReason, priceKrw } = isMediaContentLocked({
          viewerId,
          authorId,
          visibility,
          instantPurchasePriceKrw: post.instantPurchasePriceKrw ?? 0,
          mediaPriceKrw: m.priceKrw,
          purchased: purchasedIds.has(m.id),
          subscription,
        });
        const gated = rewritePaidVideoSrc({
          id: m.id,
          url: m.url,
          type: m.type,
          priceKrw: m.priceKrw,
          locked,
          hlsUrl: m.hlsUrl,
        });
        return {
          ...m,
          url: gated.url,
          hlsUrl: gated.hlsUrl,
          locked,
          lockReason,
          instantPurchasePriceKrw: priceKrw,
        };
      }),
    };
  });
}
