import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { isSrsConfigured } from "@/lib/srs";

export type LiveIngestEngine = "livekit" | "srs";

/** 방송 송출 — LiveKit Ingress 우선 (OBS→클라우드, VPS 방화벽 불필요) */
export function preferredLiveIngestEngine(): LiveIngestEngine {
  if (isLivekitIngressConfigured()) return "livekit";
  if (isSrsConfigured()) return "srs";
  return "srs";
}

export function isLivekitIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  const id = channel.rtmpIngressId?.trim() ?? "";
  return !!id && !id.startsWith("srs:");
}
