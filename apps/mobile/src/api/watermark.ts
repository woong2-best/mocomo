import { apiRequest } from "@/api/client";
import { API_BASE_URL } from "@/config/env";

export type WatermarkPublicConfig = {
  enabled: boolean;
  watermarkVersion: number;
  protocolVersion: number;
  temporalPeriod: number;
  modulationStrength: number;
};

export type ForensicRenderConfig = {
  watermarkVersion: number;
  sessionId: string;
  spreadSeedB64: string;
  codewordB64: string;
  temporalPeriod: number;
  modulationStrength: number;
};

export type WatermarkContentKind = "POST_MEDIA" | "EPISODE" | "MESSAGE_ATTACHMENT";

const EMBED_KIND_QUERY: Record<WatermarkContentKind, string> = {
  POST_MEDIA: "",
  EPISODE: "episode",
  MESSAGE_ATTACHMENT: "message",
};

export async function fetchWatermarkConfig(): Promise<WatermarkPublicConfig> {
  return apiRequest<WatermarkPublicConfig>("/api/watermark/config", { auth: false });
}

export async function createWatermarkSession(
  contentId: string,
  contentKind: WatermarkContentKind = "POST_MEDIA"
): Promise<{ sessionId: string; renderConfig: ForensicRenderConfig }> {
  return apiRequest("/api/watermark/session", {
    method: "POST",
    auth: true,
    body: { contentId, contentKind },
  });
}

export async function createPaidVideoWebHandoff(
  mediaId: string,
  contentKind: WatermarkContentKind = "POST_MEDIA",
  mediaType: "video" | "image" = "video"
): Promise<string> {
  const query = new URLSearchParams();
  const kind = EMBED_KIND_QUERY[contentKind];
  if (kind) query.set("kind", kind);
  if (mediaType === "image") query.set("type", "image");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const redirect = `/embed/paid-video/${encodeURIComponent(mediaId)}${suffix}`;
  const res = await apiRequest<{ url: string }>("/api/mobile/auth/web-session", {
    method: "POST",
    auth: true,
    body: { redirect },
  });
  return res.url;
}

export function isPaidPlaybackPath(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("/api/media/paid/");
}

export function resolveAbsolutePlaybackUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}
