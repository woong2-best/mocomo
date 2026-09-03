/** Hub hero — inline muted preview (SRS / Cloudflare HLS). External embeds use thumbnail only. */
export function supportsHubVideoPreview(broadcastMode?: string | null): boolean {
  if (!broadcastMode) return true;
  return broadcastMode === "BROWSER" || broadcastMode === "OBS";
}

export function absolutePlaybackUrl(pathOrUrl: string, origin?: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return pathOrUrl;
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
