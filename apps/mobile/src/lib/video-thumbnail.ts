import { useEffect, useState } from "react";
import type { FeedMedia } from "@/api/feed";
import { resolveVideoPoster } from "@/lib/video-poster";

/** Server URL or an expo-video VideoThumbnail (valid expo-image source). */
export type FeedVideoPosterSource = string | object;

const memory = new Map<string, FeedVideoPosterSource>();
const inflight = new Map<string, Promise<FeedVideoPosterSource | null>>();
let activeExtracts = 0;
const queue: Array<() => void> = [];
const MAX_PARALLEL = 1;

function videoSrc(media: FeedMedia): string {
  const progressive = media.url?.trim() || "";
  const hls = media.hlsUrl?.trim() || "";
  if (progressive && !progressive.includes(".m3u8")) return progressive;
  return hls || progressive;
}

function cacheKey(media: FeedMedia): string {
  return videoSrc(media) || media.id || "";
}

export function peekExtractedVideoPoster(media: FeedMedia): FeedVideoPosterSource | null {
  const key = cacheKey(media);
  return key ? memory.get(key) ?? null : null;
}

export function resolveCachedVideoPoster(media: FeedMedia): FeedVideoPosterSource | null {
  return resolveVideoPoster(media) || peekExtractedVideoPoster(media);
}

async function extractOnce(url: string): Promise<FeedVideoPosterSource | null> {
  const { createVideoPlayer } = await import("expo-video");
  const player = createVideoPlayer(url);
  try {
    player.muted = true;
    const thumbs = await player.generateThumbnailsAsync([0, 1], { maxHeight: 720 });
    return thumbs[0] ?? thumbs[1] ?? null;
  } catch {
    return null;
  } finally {
    try {
      player.release();
    } catch {
      // ignore
    }
  }
}

export function extractVideoPoster(url: string): Promise<FeedVideoPosterSource | null> {
  const key = url.trim();
  if (!key) return Promise.resolve(null);
  const hit = memory.get(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = new Promise<FeedVideoPosterSource | null>((resolve) => {
    const start = async () => {
      activeExtracts += 1;
      try {
        const result = await extractOnce(key);
        if (result) memory.set(key, result);
        resolve(result);
      } catch {
        resolve(null);
      } finally {
        activeExtracts -= 1;
        inflight.delete(key);
        queue.shift()?.();
      }
    };
    if (activeExtracts >= MAX_PARALLEL) queue.push(start);
    else void start();
  });
  inflight.set(key, job);
  return job;
}

/** Server poster first; otherwise a cached / extracted first frame. */
export function useFeedVideoPoster(media: FeedMedia): FeedVideoPosterSource | null {
  const server = resolveVideoPoster(media);
  const [extracted, setExtracted] = useState<FeedVideoPosterSource | null>(() =>
    server ? server : peekExtractedVideoPoster(media)
  );

  useEffect(() => {
    if (server) {
      setExtracted(server);
      return;
    }
    const src = videoSrc(media);
    if (!src) return;
    const cached = memory.get(src);
    if (cached) {
      setExtracted(cached);
      return;
    }
    let cancelled = false;
    void extractVideoPoster(src).then((poster) => {
      if (!cancelled && poster) setExtracted(poster);
    });
    return () => {
      cancelled = true;
    };
  }, [media.hlsUrl, media.id, media.url, server]);

  return server ?? extracted;
}

export function posterToImageSource(
  poster: FeedVideoPosterSource,
  cachedStringSource: (uri: string) => unknown
): unknown {
  if (typeof poster === "string") return cachedStringSource(poster);
  return poster;
}
