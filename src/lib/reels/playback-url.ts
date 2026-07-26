import { getNetworkQuality, type NetworkQuality } from "@/lib/video-playback/network";

/** True if URL looks like an HLS manifest. */
export function isHlsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  return clean.endsWith(".m3u8");
}

/**
 * Resolve primary playback source.
 * Prefer explicit HLS when available; otherwise progressive CDN URL.
 */
export function resolveReelPlaybackSrc(media: {
  url: string;
  hlsUrl?: string | null;
}): { src: string; mode: "hls" | "progressive" } {
  const hls = media.hlsUrl?.trim() || null;
  if (hls && isHlsUrl(hls)) return { src: hls, mode: "hls" };
  if (isHlsUrl(media.url)) return { src: media.url, mode: "hls" };
  return { src: media.url, mode: "progressive" };
}

/** Map network → hls.js startLevel hint (-1 = ABR auto). */
export function hlsStartLevelForNetwork(quality: NetworkQuality = getNetworkQuality()): number {
  if (quality === "slow") return 0;
  if (quality === "medium") return 1;
  return -1;
}

export function reelPreloadForDistance(
  distance: number,
  quality: NetworkQuality = getNetworkQuality()
): "none" | "metadata" | "auto" {
  if (distance === 0) return quality === "slow" ? "metadata" : "auto";
  if (distance === 1) return quality === "slow" ? "none" : "metadata";
  if (distance === 2 && quality === "fast") return "metadata";
  return "none";
}
