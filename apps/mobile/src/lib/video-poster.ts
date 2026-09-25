import type { FeedMedia } from "@/api/feed";

/** Same poster URL the feed already cached, so STAR cells do not re-download it. */
export function resolveVideoPoster(media: FeedMedia): string | null {
  const direct = media.posterUrl?.trim();
  if (direct) return direct;

  const streamUid = media.streamUid?.trim();
  if (streamUid && /^[a-zA-Z0-9_-]{16,}$/.test(streamUid)) {
    return `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg?time=0s&height=720`;
  }

  // Only derive from known Cloudflare Stream hosts — never guess from arbitrary hex paths
  // (R2/CDN keys often contain 32-hex segments and would 404 on videodelivery.net).
  const probe = media.hlsUrl?.trim() || media.url?.trim() || "";
  const uid =
    probe.match(/videodelivery\.net\/([^/?#]+)/i)?.[1] ||
    probe.match(/cloudflarestream\.com\/([^/?#]+)/i)?.[1];
  if (uid && /^[a-zA-Z0-9_-]{16,}$/.test(uid)) {
    return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=0s&height=720`;
  }
  return null;
}
