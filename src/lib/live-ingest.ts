import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { isSrsConfigured } from "@/lib/srs";

export type LiveIngestEngine = "livekit" | "srs";

/**
 * 방송 송출 엔진 — 기본 LiveKit Cloud (트위치/유튜브와 동일한 managed RTMP + WebRTC).
 * Vercel: LIVE_INGEST_ENGINE=livekit|srs (미설정 시 LiveKit 우선)
 */
export function preferredLiveIngestEngine(): LiveIngestEngine {
  const forced = process.env.LIVE_INGEST_ENGINE?.trim().toLowerCase();
  if (forced === "srs" && isSrsConfigured()) return "srs";
  if (forced === "livekit" && isLivekitIngressConfigured()) return "livekit";

  if (isLivekitIngressConfigured()) return "livekit";
  if (isSrsConfigured()) return "srs";
  return "livekit";
}

export function isLivekitIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  const id = channel.rtmpIngressId?.trim() ?? "";
  return !!id && !id.startsWith("srs:");
}

export function isSrsIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  const id = channel.rtmpIngressId?.trim() ?? "";
  return id.startsWith("srs:") || (!id && isSrsConfigured() && !isLivekitIngressConfigured());
}

/** 채널 DB + 사이트 기본 엔진 — 플레이어·상태 API 공통 */
export function resolveChannelIngestEngine(channel: {
  rtmpIngressId?: string | null;
}): LiveIngestEngine {
  if (isLivekitIngestChannel(channel)) return "livekit";
  return preferredLiveIngestEngine();
}
