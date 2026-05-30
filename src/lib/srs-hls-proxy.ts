import { buildHlsPlaybackUrl, getSrsHlsBaseUrl } from "@/lib/srs";

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
          const rest = trimmed.slice(base.length).replace(/^\//, "");
          return `${proxyBase}/${rest}`;
        }
        try {
          const u = new URL(trimmed);
          const rest = u.pathname.replace(/^\/live\//, "").replace(/^\//, "");
          return `${proxyBase}/${rest}`;
        } catch {
          return line;
        }
      }

      return `${proxyBase}/${trimmed.replace(/^\//, "")}`;
    })
    .join("\n");
}

export function upstreamSegmentUrl(relativePath: string): string {
  const base = getSrsHlsBaseUrl().replace(/\/$/, "");
  const clean = relativePath.replace(/^\//, "");
  return `${base}/${clean}`;
}

/** 서버에서 SRS manifest 존재 여부 확인 */
export async function probeSrsManifest(streamKey: string): Promise<{
  live: boolean;
  status?: number;
  error?: string;
}> {
  const url = upstreamHlsManifestUrl(streamKey);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/vnd.apple.mpegurl,*/*" },
    });
    if (!res.ok) {
      return { live: false, status: res.status, error: `SRS ${res.status}` };
    }
    const text = await res.text();
    if (!text.includes("#EXTM3U")) {
      return { live: false, error: "invalid manifest" };
    }
    return { live: true, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return { live: false, error: msg };
  }
}
