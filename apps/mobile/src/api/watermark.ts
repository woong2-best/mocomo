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

export type WatermarkContentKind = "POST_MEDIA" | "EPISODE";

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
  contentKind: WatermarkContentKind = "POST_MEDIA"
): Promise<string> {
  const kindQuery = contentKind === "EPISODE" ? "?kind=episode" : "";
  const redirect = `/embed/paid-video/${encodeURIComponent(mediaId)}${kindQuery}`;
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
