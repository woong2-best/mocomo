"use client";

import type { ContentLockReason } from "@/lib/content-access";

export type CachedPostMediaItem = {
  id?: string;
  url: string;
  type: string;
  priceKrw?: number;
  instantPurchasePriceKrw?: number;
  locked?: boolean;
  lockReason?: ContentLockReason;
};

type CacheEntry = {
  media: CachedPostMediaItem[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CachedPostMediaItem[] | null>>();

const TTL_MS = 5 * 60 * 1000;

export function getCachedPostMedia(postId: string): CachedPostMediaItem[] | null {
  const entry = cache.get(postId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    cache.delete(postId);
    return null;
  }
  return entry.media;
}

export function setCachedPostMedia(postId: string, media: CachedPostMediaItem[]) {
  if (!postId || media.length === 0) return;
  cache.set(postId, { media, fetchedAt: Date.now() });
}

/** 피드 미리보기가 잘린 게시글용 — hover/열기 시 전체 미디어 프리페치 */
export function prefetchPostMedia(postId: string): Promise<CachedPostMediaItem[] | null> {
  if (!postId) return Promise.resolve(null);

  const cached = getCachedPostMedia(postId);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(postId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/media`, { credentials: "same-origin" });
      if (!res.ok) return null;
      const data = (await res.json()) as { media?: CachedPostMediaItem[] };
      if (!Array.isArray(data.media) || data.media.length === 0) return null;
      setCachedPostMedia(postId, data.media);
      return data.media;
    } catch {
      return null;
    } finally {
      inflight.delete(postId);
    }
  })();

  inflight.set(postId, promise);
  return promise;
}
