import { isCloudflareStreamConfigured } from "@/lib/cloudflare-stream";
import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { isSrsConfigured } from "@/lib/srs";

export type LiveIngestEngine = "cloudflare" | "livekit" | "srs";

/**
 * 방송 송출 엔진 — 기본 Cloudflare Stream Live.
 * LIVE_INGEST_ENGINE=cloudflare|livekit|srs
 */
export function preferredLiveIngestEngine(): LiveIngestEngine {
  const forced = process.env.LIVE_INGEST_ENGINE?.trim().toLowerCase();
  if (forced === "cloudflare" && isCloudflareStreamConfigured()) return "cloudflare";
  if (forced === "livekit" && isLivekitIngressConfigured()) return "livekit";
  if (forced === "srs" && isSrsConfigured()) return "srs";

  if (isCloudflareStreamConfigured()) return "cloudflare";
  if (isLivekitIngressConfigured()) return "livekit";
  if (isSrsConfigured()) return "srs";
  return "cloudflare";
}

export function isCloudflareIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  return channel.rtmpIngressId?.trim().startsWith("cf:") ?? false;
}

export function isLivekitIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  const id = channel.rtmpIngressId?.trim() ?? "";
  return !!id && !id.startsWith("srs:") && !id.startsWith("cf:");
}

export function isSrsIngestChannel(channel: { rtmpIngressId?: string | null }): boolean {
  const id = channel.rtmpIngressId?.trim() ?? "";
  return id.startsWith("srs:");
}

/** 채널 DB + 사이트 기본 엔진 */
export function resolveChannelIngestEngine(channel: {
  rtmpIngressId?: string | null;
}): LiveIngestEngine {
  if (isCloudflareIngestChannel(channel)) return "cloudflare";
  if (isLivekitIngestChannel(channel)) return "livekit";
  return preferredLiveIngestEngine();
}
