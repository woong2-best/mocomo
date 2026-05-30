import {
  buildFlvPlaybackUrl,
  buildHlsPlaybackUrl,
  flvCandidateUrls,
  getSrsHlsBaseUrl,
} from "@/lib/srs";

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

async function fetchManifestText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/vnd.apple.mpegurl,*/*" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes("#EXTM3U") ? text : null;
  } catch {
    return null;
  }
}

/** 마스터 m3u8 → 실제 미디어 m3u8 따라가기 */
async function resolveMediaPlaylist(
  streamKey: string,
  url: string,
  text: string
): Promise<{ url: string; text: string } | null> {
  if (!text.includes("#EXT-X-STREAM-INF")) {
    return { url, text };
  }
  const base = getSrsHlsBaseUrl().replace(/\/$/, "");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const mediaUrl = t.startsWith("http") ? t : `${base}/${normalizeHlsRelativePath(t)}`;
    const mediaText = await fetchManifestText(mediaUrl);
    if (mediaText) return { url: mediaUrl, text: mediaText };
  }
  const name = streamKey.trim().split("?")[0];
  const fallback = `${base}/${name}.m3u8`;
  const mediaText = await fetchManifestText(fallback);
  if (mediaText) return { url: fallback, text: mediaText };
  return null;
}

/** VPS에서 동작하는 m3u8 URL 찾기 */
export async function fetchUpstreamManifest(streamKey: string): Promise<{
  url: string;
  text: string;
} | null> {
  for (const url of manifestCandidateUrls(streamKey)) {
    const text = await fetchManifestText(url);
    if (!text) continue;
    const resolved = await resolveMediaPlaylist(streamKey, url, text);
    if (resolved) return resolved;
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

/** SRS HTTP API — RTMP publish 여부 (1985가 막히면 false) */
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

/** 8080 HTTP-FLV — API(1985) 차단 시 송출 감지용 */
export async function probeSrsFlvPublish(streamKey: string): Promise<boolean> {
  for (const url of flvCandidateUrls(streamKey)) {
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: { Range: "bytes=0-4095" },
      });
      const ct = res.headers.get("content-type") ?? "";
      if (res.ok && (ct.includes("flv") || ct.includes("octet-stream") || res.status === 206)) {
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

/** VPS에서 응답하는 FLV URL (프록시 upstream) */
export async function resolveSrsFlvUpstreamUrl(streamKey: string): Promise<string | null> {
  for (const url of flvCandidateUrls(streamKey)) {
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
        headers: { Range: "bytes=0-1" },
      });
      if (res.ok || res.status === 206) return url;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Vercel → VPS: 1985 막혀도 HLS/FLV로 송출 여부 판별 */
export async function isSrsStreamOnAir(streamKey: string): Promise<boolean> {
  if (await probeSrsRtmpPublish(streamKey)) return true;
  if (await probeSrsFlvPublish(streamKey)) return true;
  const manifest = await fetchUpstreamManifest(streamKey);
  return !!manifest;
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
  const flvPublish = await probeSrsFlvPublish(streamKey);
  const flvUrl = buildFlvPlaybackUrl(streamKey);

  const manifest = await fetchUpstreamManifest(streamKey);
  if (!manifest) {
    const onAir = rtmpPublish || flvPublish;
    return {
      live: onAir,
      playable: false,
      rtmpPublish: onAir,
      flvUrl,
      error: onAir
        ? "HLS m3u8 없음 (VPS 8080·HLS 설정 확인). FLV 폴백 시도 가능."
        : "no RTMP publish",
    };
  }

  const segPath = firstSegmentPathFromManifest(manifest.text);
  const onAir = rtmpPublish || flvPublish;
  if (!segPath) {
    return {
      live: true,
      playable: false,
      rtmpPublish: onAir || true,
      manifestUrl: manifest.url,
      flvUrl,
      error: "HLS 세그먼트 대기 중 (FLV 재생 권장)",
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
