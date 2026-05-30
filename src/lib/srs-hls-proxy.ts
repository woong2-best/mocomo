import { buildHlsPlaybackUrl, getSrsHlsBaseUrl } from "@/lib/srs";

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

/** SRS m3u8/ts를 사이트 프록시 경로로 치환 */
export function rewriteHlsPlaylist(
  body: string,
  channelId: string,
  upstreamBase: string
): string {
  const base = upstreamBase.replace(/\/$/, "");
  const proxyBase = `/api/live/${channelId}/hls`;

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;

      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        if (trimmed.startsWith(base)) {
          const rest = normalizeHlsRelativePath(trimmed.slice(base.length));
          return `${proxyBase}/${rest}`;
        }
        try {
          const u = new URL(trimmed);
          const rest = normalizeHlsRelativePath(u.pathname);
          return `${proxyBase}/${rest}`;
        } catch {
          return line;
        }
      }

      return `${proxyBase}/${normalizeHlsRelativePath(trimmed)}`;
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
    if (t.endsWith(".ts") || t.endsWith(".m4s") || t.endsWith(".mp4")) return t;
  }
  return null;
}

/** SRS HTTP API — RTMP publish 여부 (HLS 파일보다 먼저 뜰 수 있음) */
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
        s.name === name ||
        s.name === `live/${name}` ||
        (s.publish?.active && (s.name?.includes(name) ?? false))
    );
  } catch {
    return false;
  }
}

/** 서버에서 SRS manifest·세그먼트 재생 가능 여부 확인 */
export async function probeSrsManifest(streamKey: string): Promise<{
  live: boolean;
  playable?: boolean;
  rtmpPublish?: boolean;
  status?: number;
  error?: string;
}> {
  const url = upstreamHlsManifestUrl(streamKey);
  const rtmpPublish = await probeSrsRtmpPublish(streamKey);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/vnd.apple.mpegurl,*/*" },
    });
    if (!res.ok) {
      if (rtmpPublish) {
        return {
          live: true,
          playable: false,
          rtmpPublish: true,
          status: res.status,
          error: `HLS manifest ${res.status} (RTMP 송출 중)`,
        };
      }
      return { live: false, rtmpPublish, status: res.status, error: `SRS ${res.status}` };
    }
    const text = await res.text();
    if (!text.includes("#EXTM3U")) {
      if (rtmpPublish) {
        return {
          live: true,
          playable: false,
          rtmpPublish: true,
          error: "HLS manifest invalid (RTMP 송출 중)",
        };
      }
      return { live: false, rtmpPublish, error: "invalid manifest" };
    }

    const segPath = firstSegmentPathFromManifest(text);
    if (!segPath) {
      return {
        live: true,
        playable: false,
        rtmpPublish,
        status: res.status,
        error: "manifest has no segments yet",
      };
    }

    const segUrl = upstreamSegmentUrl(segPath);
    let segOk = false;
    try {
      const segRes = await fetch(segUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
        headers: { Range: "bytes=0-1" },
      });
      segOk = segRes.ok && (segRes.headers.get("content-length") !== "0" || segRes.status === 206);
    } catch {
      segOk = false;
    }

    return {
      live: true,
      playable: segOk,
      rtmpPublish,
      status: res.status,
      error: segOk ? undefined : "HLS segments not ready",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    if (rtmpPublish) {
      return { live: true, playable: false, rtmpPublish: true, error: msg };
    }
    return { live: false, rtmpPublish, error: msg };
  }
}
