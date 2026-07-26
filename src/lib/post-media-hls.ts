import { db } from "@/lib/db";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { revalidateTag } from "next/cache";
import {
  copyStreamFromUrl,
  getStreamVodStatus,
  isCloudflareStreamConfigured,
  waitForStreamReady,
} from "@/lib/cloudflare-stream-vod";

type VideoMediaRef = { id: string; url: string };

/**
 * Fire-and-forget: copy VIDEO media into Cloudflare Stream for HLS ABR.
 * Saves streamUid immediately; writes hlsUrl/posterUrl when ready.
 */
export function enqueuePostMediaHlsPackaging(media: VideoMediaRef[]): void {
  if (!isCloudflareStreamConfigured() || media.length === 0) return;
  void packagePostMediaHls(media).catch((e) => {
    console.error("[post-media-hls] enqueue", e);
  });
}

export async function packagePostMediaHls(media: VideoMediaRef[]): Promise<{
  started: number;
  ready: number;
  errors: number;
}> {
  let started = 0;
  let ready = 0;
  let errors = 0;

  for (const item of media) {
    const url = item.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) continue;

    try {
      const existing = await db.postMedia.findUnique({
        where: { id: item.id },
        select: { hlsUrl: true, streamUid: true },
      });
      if (existing?.hlsUrl) {
        ready += 1;
        continue;
      }

      let uid = existing?.streamUid?.trim() || null;
      if (!uid) {
        const copy = await copyStreamFromUrl(url, {
          mediaId: item.id,
          source: "mocomo-post",
        });
        uid = copy.uid;
        started += 1;
        await db.postMedia.update({
          where: { id: item.id },
          data: {
            streamUid: uid,
            ...(copy.ready && copy.hlsUrl
              ? { hlsUrl: copy.hlsUrl, posterUrl: copy.posterUrl }
              : {}),
            ...(copy.duration ? { duration: copy.duration } : {}),
          },
        });
        if (copy.ready && copy.hlsUrl) {
          ready += 1;
          continue;
        }
      } else {
        started += 1;
      }

      const status = await waitForStreamReady(uid, { maxMs: 8_000 });
      if (status?.ready && status.hlsUrl) {
        await db.postMedia.update({
          where: { id: item.id },
          data: {
            hlsUrl: status.hlsUrl,
            posterUrl: status.posterUrl,
            ...(status.duration ? { duration: status.duration } : {}),
          },
        });
        ready += 1;
      }
    } catch (e) {
      errors += 1;
      console.error("[post-media-hls] package", item.id, e);
    }
  }

  if (ready > 0) {
    try {
      revalidateTag(FEED_POSTS_CACHE_TAG);
    } catch {
      /* ignore */
    }
  }

  return { started, ready, errors };
}

/** Cron: finalize in-flight Stream jobs + start a few unstarted free videos. */
export async function finalizePendingPostMediaHls(limit = 20): Promise<{
  checked: number;
  ready: number;
  started: number;
}> {
  if (!isCloudflareStreamConfigured()) {
    return { checked: 0, ready: 0, started: 0 };
  }

  let checked = 0;
  let ready = 0;
  let started = 0;

  const inflight = await db.postMedia.findMany({
    where: {
      type: "VIDEO",
      hlsUrl: null,
      streamUid: { not: null },
    },
    orderBy: { id: "desc" },
    take: limit,
    select: { id: true, streamUid: true },
  });

  for (const row of inflight) {
    checked += 1;
    const uid = row.streamUid?.trim();
    if (!uid) continue;
    try {
      const status = await getStreamVodStatus(uid);
      if (status?.ready && status.hlsUrl) {
        await db.postMedia.update({
          where: { id: row.id },
          data: {
            hlsUrl: status.hlsUrl,
            posterUrl: status.posterUrl,
            ...(status.duration ? { duration: status.duration } : {}),
          },
        });
        ready += 1;
      }
    } catch (e) {
      console.error("[post-media-hls] finalize inflight", row.id, e);
    }
  }

  const startBudget = Math.min(5, Math.max(0, limit - inflight.length));
  if (startBudget > 0) {
    const unstarted = await db.postMedia.findMany({
      where: {
        type: "VIDEO",
        hlsUrl: null,
        streamUid: null,
        priceKrw: 0,
        url: { startsWith: "http" },
      },
      orderBy: { id: "desc" },
      take: startBudget,
      select: { id: true, url: true },
    });

    if (unstarted.length > 0) {
      const result = await packagePostMediaHls(unstarted);
      checked += unstarted.length;
      started += result.started;
      ready += result.ready;
    }
  }

  if (ready > 0) {
    try {
      revalidateTag(FEED_POSTS_CACHE_TAG);
    } catch {
      /* ignore */
    }
  }

  return { checked, ready, started };
}
