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

/** Locked teaser: first few seconds / a downscaled still. Origin URL stays server-side. */
export const PAID_PREVIEW_SECONDS = 5;
export const PAID_PREVIEW_MAX_BYTES = 3_500_000;

export function paidMediaPreviewPath(mediaId: string): string {
  return `${PAID_MEDIA_PLAYBACK_PREFIX}/${encodeURIComponent(mediaId)}/preview`;
}

/** Cap a Range header so a locked preview cannot stream the full file. */
export function clampPaidPreviewRange(
  range: string | null,
  maxBytes = PAID_PREVIEW_MAX_BYTES
): string {
  const last = Math.max(0, maxBytes - 1);
  const match = range?.match(/^bytes=(\d+)-(\d+)?$/i);
  if (!match) return `bytes=0-${last}`;
  const start = Math.min(Number(match[1]), last);
  const endRaw = match[2] == null ? last : Number(match[2]);
  const end = Math.min(endRaw, last);
  return `bytes=${start}-${Math.max(start, end)}`;
}

export function paidEpisodePlaybackPath(episodeId: string): string {
  return `${PAID_MEDIA_PLAYBACK_PREFIX}/episode/${encodeURIComponent(episodeId)}`;
}

export function isPaidPlaybackPath(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith(PAID_MEDIA_PLAYBACK_PREFIX));
}

/**
 * Strip origin bytes from payloads the browser should not see.
 * Locked sale media (image or video) get an empty src so CSS-blur is not
 * enough — the img/video tag never fetches the file. Unlocked paid video
 * plays through a same-origin gate. HLS is omitted for paid video.
 */
export function rewritePaidVideoSrc(input: {
  id: string;
  url: string;
  type: string;
  priceKrw?: number | null;
  locked?: boolean;
  hlsUrl?: string | null;
  posterUrl?: string | null;
}): { url: string; hlsUrl: string | null; posterUrl: string | null } {
  if (input.locked) {
    if (!input.id) return { url: "", hlsUrl: null, posterUrl: null };
    return {
      url: paidMediaPreviewPath(input.id),
      hlsUrl: null,
      posterUrl: null,
    };
  }
  if ((input.priceKrw ?? 0) > 0) {
    if (input.type === "VIDEO" || input.type === "IMAGE") {
      return { url: paidMediaPlaybackPath(input.id), hlsUrl: null, posterUrl: null };
    }
  }
  return {
    url: input.url,
    hlsUrl: input.hlsUrl ?? null,
    posterUrl: input.posterUrl ?? null,
  };
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
  id?: string;
  url: string;
  type: string;
  priceKrw?: number | null;
  hlsUrl?: string | null;
  posterUrl?: string | null;
  locked?: boolean;
};

/**
 * Per-viewer lock + origin-URL stripping for list/detail payloads.
 * Must run after any shared cache so one viewer's purchase is not reused.
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

  const mediaIds = posts.flatMap(
    (p) => p.media?.map((m) => m.id).filter((id): id is string => Boolean(id)) ?? []
  );
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
          purchased: Boolean(m.id && purchasedIds.has(m.id)),
          subscription,
        });
        const gated = rewritePaidVideoSrc({
          id: m.id ?? "",
          url: m.url,
          type: m.type,
          priceKrw,
          locked,
          hlsUrl: m.hlsUrl,
          posterUrl: m.posterUrl,
        });
        return {
          ...m,
          url: gated.url,
          hlsUrl: gated.hlsUrl,
          posterUrl: gated.posterUrl,
          locked,
          lockReason,
          instantPurchasePriceKrw: priceKrw,
        };
      }),
    };
  });
}
