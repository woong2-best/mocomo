/**
 * Static thumbnail for video cards/grids when posterUrl is missing.
 * Derives Cloudflare Stream thumbnail from streamUid, hlsUrl, or progressive url.
 * Never guesses Stream UIDs from arbitrary hex path segments (CDN keys false-positive).
 */
export function resolveVideoPosterUrl(input: {
  posterUrl?: string | null;
  hlsUrl?: string | null;
  url?: string | null;
  streamUid?: string | null;
}): string | null {
  const direct = input.posterUrl?.trim();
  if (direct) return direct;

  const streamUid = input.streamUid?.trim();
  if (streamUid && /^[a-zA-Z0-9_-]{16,}$/.test(streamUid)) {
    return `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg?time=0s&height=720`;
  }

  const probe = input.hlsUrl?.trim() || input.url?.trim() || "";
  if (!probe) return null;

  const uid =
    probe.match(/videodelivery\.net\/([^/?#]+)/i)?.[1] ||
    probe.match(/cloudflarestream\.com\/([^/?#]+)/i)?.[1];

  if (uid && /^[a-zA-Z0-9_-]{16,}$/.test(uid)) {
    return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=0s&height=720`;
  }

  return null;
}
