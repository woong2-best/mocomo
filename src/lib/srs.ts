import { randomBytes } from "crypto";

const SRS_APP = "live";

/** RTMP ingest (OBS 「서버」) — 예: rtmp://stream.mocomo.net/live */
export function getSrsRtmpUrl(): string {
  const url = process.env.SRS_RTMP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "rtmp://127.0.0.1:1935/live";
}

/** HLS 재생 베이스 (CDN) — 예: https://cdn.mocomo.net/live */
export function getSrsHlsBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SRS_HLS_BASE_URL?.trim() ||
    process.env.SRS_HLS_BASE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://127.0.0.1:8080/live";
}

/** 방송 키(스트림 이름) — channelId_랜덤 (DB에 저장 후 웹훅·재생에 사용) */
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

export function isSrsConfigured(): boolean {
  return !!process.env.SRS_RTMP_URL?.trim() && getSrsHlsPublicConfigured();
}

export function getSrsHlsPublicConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SRS_HLS_BASE_URL?.trim() || process.env.SRS_HLS_BASE_URL?.trim()
  );
}

export function srsConfigError(): string | null {
  if (!process.env.SRS_RTMP_URL?.trim()) {
    return "SRS RTMP가 설정되지 않았습니다. SRS_RTMP_URL(예: rtmp://your-server:1935/live)을 설정해 주세요.";
  }
  if (!getSrsHlsPublicConfigured()) {
    return "HLS 재생 URL이 없습니다. NEXT_PUBLIC_SRS_HLS_BASE_URL(예: https://cdn.mocomo.net/live)을 설정해 주세요.";
  }
  return null;
}

export function srsWebhookSecret(): string | null {
  return process.env.SRS_WEBHOOK_SECRET?.trim() || null;
}

export { SRS_APP };
