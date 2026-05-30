import { buildFlvPlaybackUrl, buildHlsPlaybackUrl, getSrsHlsBaseUrl } from "@/lib/srs";

/** m3u8·ts 상대 경로 정규화 (live/ 중복 방지) */
export function normalizeHlsRelativePath(relativePath: string): string {
  let clean = relativePath.trim().replace(/^\//, "");
  if (clean.startsWith("./")) clean = clean.slice(2);
  if (clean.startsWith("live/")) clean = clean.slice(5);
  return clean;
}

function srsApiOriginFromHlsBase(): string | null {
  try {
    const u = new URL(getSrsHlsBaseUrl());
    u.port = process.env.SRS_API_PORT?.trim() || "1985";
    u.pathname = "";
    u.search = "";
    return u.origin;
  } catch {
    return null;
  }
}

/** 브라우저 HTTPS 페이지에서 HTTP SRS 직접 재생 차단 방지 */
export function buildProxiedHlsPlaybackPath(channelId: string, streamKey?: string): string {
  const key = streamKey?.trim().split("?")[0];
  if (key) {
    return `/api/live/${channelId}/hls/${encodeURIComponent(key)}.m3u8`;
  }
  return `/api/live/${channelId}/hls/index.m3u8`;
}

export function upstreamHlsManifestUrl(streamKey: string): string {
  return buildHlsPlaybackUrl(streamKey);
}

export function manifestCandidateUrls(streamKey: string): string[] {
  const name = streamKey.trim().split("?")[0];
  const base = getSrsHlsBaseUrl().replace(/\/$/, "");
  return [
    `${base}/${name}.m3u8`,
    `${base}/live/${name}.m3u8`,
    `${base}/${name}/index.m3u8`,
  ];
}

/** VPS에서 동작하는 m3u8 URL 찾기 */
export async function fetchUpstreamManifest(streamKey: string): Promise<{
  url: string;
  text: string;
} | null> {
  for (const url of manifestCandidateUrls(streamKey)) {
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "application/vnd.apple.mpegurl,*/*" },
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes("#EXTM3U")) return { url, text };
    } catch {
      /* try next */
    }
  }
  return null;
}

function rewriteUriLine(trimmed: string, proxyBase: string, upstreamBase: string): string {
  const qIdx = trimmed.indexOf("?");
  const pathPart = qIdx >= 0 ? trimmed.slice(0, qIdx) : trimmed;
  const query = qIdx >= 0 ? trimmed.slice(qIdx) : "";

  if (pathPart.startsWith("http://") || pathPart.startsWith("https://")) {
    const base = upstreamBase.replace(/\/$/, "");
    if (pathPart.startsWith(base)) {
      const rest = normalizeHlsRelativePath(pathPart.slice(base.length));
      return `${proxyBase}/${rest}${query}`;
    }
    try {
      const u = new URL(pathPart);
      const rest = normalizeHlsRelativePath(u.pathname);
      return `${proxyBase}/${rest}${query}`;
    } catch {
      return trimmed;
    }
  }

  if (pathPart.startsWith("/")) {
    const rest = normalizeHlsRelativePath(pathPart);
    return `${proxyBase}/${rest}${query}`;
  }

  return `${proxyBase}/${normalizeHlsRelativePath(pathPart)}${query}`;
}

/** SRS m3u8/ts를 사이트 프록시 경로로 치환 (절대경로·hls_ctx 쿼리 포함) */
export function rewriteHlsPlaylist(
  body: string,
  channelId: string,
  upstreamBase: string
): string {
  const proxyBase = `/api/live/${channelId}/hls`;

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return rewriteUriLine(trimmed, proxyBase, upstreamBase);
    })
    .join("\n");
}

export function upstreamSegmentUrl(relativePath: string): string {
  const base = getSrsHlsBaseUrl().replace(/\/$/, "");
  const clean = normalizeHlsRelativePath(relativePath);
  return `${base}/${clean}`;
}

function firstSegmentPathFromManifest(text: string): string | null {
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (t.endsWith(".ts") || t.endsWith(".m4s") || t.endsWith(".mp4") || t.endsWith(".m3u8")) {
      return t.split("?")[0] + (t.includes("?") ? "?" + t.split("?").slice(1).join("?") : "");
    }
  }
  return null;
}

/** SRS HTTP API — RTMP publish 여부 */
export async function probeSrsRtmpPublish(streamKey: string): Promise<boolean> {
  const origin = srsApiOriginFromHlsBase();
  if (!origin) return false;
  const name = streamKey.trim().split("?")[0];
  try {
    const res = await fetch(`${origin}/api/v1/streams/?count=50`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as {
      streams?: Array<{ name?: string; publish?: { active?: boolean } }>;
    };
    const streams = json.streams ?? [];
    return streams.some(
      (s) =>
        s.publish?.active &&
        (s.name === name || s.name === `live/${name}` || s.name?.endsWith(`/${name}`))
    );
  } catch {
    return false;
  }
}

export async function probeSrsManifest(streamKey: string): Promise<{
  live: boolean;
  playable?: boolean;
  rtmpPublish?: boolean;
  manifestUrl?: string;
  flvUrl?: string;
  status?: number;
  error?: string;
}> {
  const rtmpPublish = await probeSrsRtmpPublish(streamKey);
  const flvUrl = buildFlvPlaybackUrl(streamKey);

  const manifest = await fetchUpstreamManifest(streamKey);
  if (!manifest) {
    return {
      live: rtmpPublish,
      playable: false,
      rtmpPublish,
      flvUrl,
      error: rtmpPublish
        ? "HLS m3u8 없음 (VPS 8080·HLS 설정 확인). FLV 폴백 시도 가능."
        : "no RTMP publish",
    };
  }

  const segPath = firstSegmentPathFromManifest(manifest.text);
  if (!segPath) {
    return {
      live: true,
      playable: false,
      rtmpPublish,
      manifestUrl: manifest.url,
      flvUrl,
      error: "HLS playlist has no segments yet",
    };
  }

  if (segPath.endsWith(".m3u8")) {
    return {
      live: true,
      playable: false,
      rtmpPublish,
      manifestUrl: manifest.url,
      flvUrl,
      error: "master playlist only — media playlist pending",
    };
  }

  const segUrl = segPath.startsWith("http")
    ? segPath
    : upstreamSegmentUrl(segPath.replace(/\?.*$/, ""));

  let segOk = false;
  try {
    const segRes = await fetch(segUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Range: "bytes=0-4095" },
    });
    segOk = segRes.ok && segRes.status !== 404;
  } catch {
    segOk = false;
  }

  return {
    live: true,
    playable: segOk,
    rtmpPublish,
    manifestUrl: manifest.url,
    flvUrl,
    error: segOk ? undefined : "HLS .ts segment not reachable from server",
  };
}
