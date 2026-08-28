/**
 * Static thumbnail for video cards/grids when posterUrl is missing.
 * Derives Cloudflare Stream thumbnail from hlsUrl or progressive url.
 */
export function resolveVideoPosterUrl(input: {
  posterUrl?: string | null;
  hlsUrl?: string | null;
  url?: string | null;
}): string | null {
  const direct = input.posterUrl?.trim();
  if (direct) return direct;

  const probe = input.hlsUrl?.trim() || input.url?.trim() || "";
  if (!probe) return null;

  const uid =
    probe.match(/videodelivery\.net\/([^/?#]+)/i)?.[1] ||
    probe.match(/cloudflarestream\.com\/([^/?#]+)/i)?.[1] ||
    probe.match(/\/([a-f0-9]{32})\//i)?.[1];

  if (uid && /^[a-zA-Z0-9_-]{16,}$/.test(uid)) {
    return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=0s&height=720`;
  }

  return null;
}
