/**
 * Cloudflare Stream VOD — copy progressive MP4 from public CDN → HLS ABR ladder.
 * Live ingest stays in cloudflare-stream.ts.
 */

import { isCloudflareStreamConfigured } from "@/lib/cloudflare-stream";

const API_BASE = "https://api.cloudflare.com/client/v4";

function accountId(): string | null {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || null;
}

function apiToken(): string | null {
  return (
    process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    null
  );
}

export type StreamVodCopyResult = {
  uid: string;
  hlsUrl: string | null;
  posterUrl: string | null;
  ready: boolean;
  duration: number | null;
};

export type StreamVodStatus = {
  uid: string;
  ready: boolean;
  hlsUrl: string | null;
  posterUrl: string | null;
  duration: number | null;
  status?: string;
};

type StreamVideoRow = {
  uid?: string;
  readyToStream?: boolean;
  status?: { state?: string };
  duration?: number;
  thumbnail?: string;
  preview?: string;
  playback?: { hls?: string; dash?: string };
};

async function streamVodApi<T>(path: string, init?: RequestInit): Promise<T> {
  const acc = accountId();
  const token = apiToken();
  if (!acc || !token) throw new Error("Cloudflare Stream not configured");

  const res = await fetch(`${API_BASE}/accounts/${acc}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: T;
  };

  if (!res.ok || !json.success) {
    const msg = json.errors?.[0]?.message || `Cloudflare Stream VOD ${res.status}`;
    throw new Error(msg);
  }
  return json.result as T;
}

function mapRow(row: StreamVideoRow | null | undefined): StreamVodStatus | null {
  const uid = row?.uid?.trim();
  if (!uid) return null;
  const ready = Boolean(row?.readyToStream);
  const hlsUrl = row?.playback?.hls?.trim() || null;
  const posterUrl = row?.thumbnail?.trim() || row?.preview?.trim() || null;
  const duration =
    typeof row?.duration === "number" && Number.isFinite(row.duration) && row.duration > 0
      ? Math.max(1, Math.round(row.duration))
      : null;
  return {
    uid,
    ready,
    hlsUrl,
    posterUrl,
    duration,
    status: row?.status?.state,
  };
}

/** Ingest a publicly reachable MP4/WebM into Cloudflare Stream. */
export async function copyStreamFromUrl(
  sourceUrl: string,
  meta?: Record<string, string>
): Promise<StreamVodCopyResult> {
  if (!isCloudflareStreamConfigured()) {
    throw new Error("Cloudflare Stream not configured");
  }
  const url = sourceUrl.trim();
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error("Stream copy requires an absolute http(s) URL");
  }

  const row = await streamVodApi<StreamVideoRow>("/stream/copy", {
    method: "POST",
    body: JSON.stringify({
      url,
      meta: { name: "mocomo-post-vod", ...(meta ?? {}) },
      requireSignedURLs: false,
      thumbnailTimestampPct: 0.05,
    }),
  });

  const mapped = mapRow(row);
  if (!mapped) throw new Error("Stream copy returned no uid");

  return {
    uid: mapped.uid,
    hlsUrl: mapped.hlsUrl,
    posterUrl: mapped.posterUrl,
    ready: mapped.ready && !!mapped.hlsUrl,
    duration: mapped.duration,
  };
}

export async function getStreamVodStatus(uid: string): Promise<StreamVodStatus | null> {
  if (!isCloudflareStreamConfigured()) return null;
  const clean = uid.trim();
  if (!clean) return null;
  try {
    const row = await streamVodApi<StreamVideoRow>(`/stream/${encodeURIComponent(clean)}`, {
      method: "GET",
    });
    return mapRow(row);
  } catch (e) {
    console.warn("[cloudflare-stream-vod] get", clean, e);
    return null;
  }
}

/** Best-effort short wait after copy (serverless-friendly). */
export async function waitForStreamReady(
  uid: string,
  opts?: { maxMs?: number; intervalMs?: number }
): Promise<StreamVodStatus | null> {
  const maxMs = opts?.maxMs ?? 8_000;
  const intervalMs = opts?.intervalMs ?? 1_500;
  const started = Date.now();
  let last: StreamVodStatus | null = null;

  while (Date.now() - started < maxMs) {
    last = await getStreamVodStatus(uid);
    if (last?.ready && last.hlsUrl) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}

export { isCloudflareStreamConfigured };
