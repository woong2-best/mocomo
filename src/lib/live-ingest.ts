import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { isSrsConfigured } from "@/lib/srs";

export type LiveIngestEngine = "livekit" | "srs";

/**
 * 방송 송출 엔진 — 기본값 VPS(SRS).
 * Vercel env: LIVE_INGEST_ENGINE=srs|livekit (없으면 SRS 우선, 결제 VPS 사용)
 */
export function preferredLiveIngestEngine(): LiveIngestEngine {
  const forced = process.env.LIVE_INGEST_ENGINE?.trim().toLowerCase();
  if (forced === "livekit" && isLivekitIngressConfigured()) return "livekit";
  if (forced === "srs" && isSrsConfigured()) return "srs";

  if (isSrsConfigured()) return "srs";
  if (isLivekitIngressConfigured()) return "livekit";
  return "srs";
}

export function isLivekitIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  const id = channel.rtmpIngressId?.trim() ?? "";
  return !!id && !id.startsWith("srs:");
}

export function isSrsIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  const id = channel.rtmpIngressId?.trim() ?? "";
  return id.startsWith("srs:") || (!id && isSrsConfigured());
}
