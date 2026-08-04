import { randomBytes } from "crypto";

const SRS_APP = "live";

/**
 * Vultr SRS 폴백(45.32.16.32)은 자체 송출 중단으로 제거.
 * 사용 시 SRS_RTMP_URL / NEXT_PUBLIC_SRS_HLS_BASE_URL 을 명시적으로 설정.
 */

/** RTMP ingest (OBS 「서버」) */
export function getSrsRtmpUrl(): string {
  const url = process.env.SRS_RTMP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "rtmp://127.0.0.1:1935/live";
}

/** HLS 재생 베이스 */
export function getSrsHlsBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SRS_HLS_BASE_URL?.trim() ||
    process.env.SRS_HLS_BASE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://127.0.0.1:8080/live";
}

export function mintSrsStreamKey(channelId: string): string {
  const token = randomBytes(12).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `${channelId}_${token || randomBytes(8).toString("hex")}`;
}

export function channelIdFromStreamKey(streamKey: string): string | null {
  const name = streamKey.trim().split("?")[0];
  const idx = name.indexOf("_");
  if (idx <= 0) return null;
  return name.slice(0, idx) || null;
}

export function buildHlsPlaybackUrl(streamKey: string): string {
  const stream = streamKey.trim().split("?")[0];
  return `${getSrsHlsBaseUrl()}/${stream}.m3u8`;
}

/** SRS http_remux FLV 후보 URL (마운트 경로 차이 대비) */
export function flvCandidateUrls(streamKey: string): string[] {
  const stream = streamKey.trim().split("?")[0];
  const base = getSrsHlsBaseUrl().replace(/\/$/, "");
  return [
    `${base}/${stream}.flv`,
    `${base}/live/${stream}.flv`,
    `${base.replace(/\/live$/, "")}/${stream}.flv`,
  ];
}

/** SRS http_remux FLV (HLS 실패 시 폴백) */
export function buildFlvPlaybackUrl(streamKey: string): string {
  return flvCandidateUrls(streamKey)[0]!;
}

export function buildProxiedFlvPlaybackPath(channelId: string, streamKey: string): string {
  const key = streamKey.trim().split("?")[0];
  return `/api/live/${channelId}/flv?key=${encodeURIComponent(key)}`;
}

export function isSrsConfigured(): boolean {
  return !!(process.env.SRS_RTMP_URL?.trim() && getSrsHlsPublicConfigured());
}

export function getSrsHlsPublicConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SRS_HLS_BASE_URL?.trim() ||
    process.env.SRS_HLS_BASE_URL?.trim()
  );
}

export function srsConfigError(): string | null {
  if (isSrsConfigured()) return null;
  if (!process.env.SRS_RTMP_URL?.trim()) {
    return "SRS RTMP가 설정되지 않았습니다. SRS_RTMP_URL을 설정해 주세요.";
  }
  if (!getSrsHlsPublicConfigured()) {
    return "HLS 재생 URL이 없습니다. NEXT_PUBLIC_SRS_HLS_BASE_URL을 설정해 주세요.";
  }
  return null;
}

export function srsWebhookSecret(): string | null {
  return process.env.SRS_WEBHOOK_SECRET?.trim() || null;
}

export { SRS_APP };
