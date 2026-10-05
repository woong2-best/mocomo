/** Frozen still of a live (not a playing video). Used on hub cards and click-to-play posters. */

export type LiveStillSource = {
  thumbnailUrl?: string | null;
  broadcastMode?: string | null;
  mediaSourceType?: string | null;
  externalProvider?: string | null;
  externalId?: string | null;
  rtmpIngressId?: string | null;
};

export function youtubeStillThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export function twitchStillThumb(login: string): string {
  const id = login.trim().toLowerCase();
  return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${encodeURIComponent(id)}-640x360.jpg`;
}

export function normalizePlatformThumbUrl(raw?: string | null): string | null {
  const url = raw?.trim();
  if (!url) return null;
  return url
    .replace(/\{player_width\}/gi, "640")
    .replace(/\{player_height\}/gi, "360")
    .replace(/\{width\}/gi, "640")
    .replace(/\{height\}/gi, "360");
}

function cloudflareStillThumb(liveInputUid: string): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_HOST?.trim() ||
    process.env.CLOUDFLARE_STREAM_CUSTOMER_HOST?.trim() ||
    null;
  if (!raw || !liveInputUid.trim()) return null;
  const host = raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${host}/${encodeURIComponent(liveInputUid.trim())}/thumbnails/thumbnail.jpg?height=360`;
}

/** Prefer a stored still, then YouTube/Twitch/Chzzk/Cloudflare preview. Never a profile photo. */
export function resolveLiveStillThumb(source: LiveStillSource): string | null {
  const stored = source.thumbnailUrl?.trim() || null;
  if (stored) return stored;

  const provider = (source.externalProvider ?? "").toUpperCase();
  const id = source.externalId?.trim() || "";
  if (id) {
    if (provider === "YOUTUBE") return youtubeStillThumb(id);
    if (provider === "TWITCH") return twitchStillThumb(id);
  }

  if (source.rtmpIngressId?.trim()) {
    return cloudflareStillThumb(source.rtmpIngressId);
  }

  return null;
}

/** Twitch preview JPGs refresh in place — bucket the cache so cards look like a recent freeze-frame. */
export function withFreshLiveStill(url: string | null | undefined): string | null {
  const raw = url?.trim() || null;
  if (!raw) return null;
  if (!raw.includes("previews-ttv")) return raw;
  try {
    const u = new URL(raw);
    u.searchParams.set("t", String(Math.floor(Date.now() / 300_000)));
    return u.toString();
  } catch {
    return raw;
  }
}

export function youtubeIdFromEmbedUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  try {
    const parts = new URL(embedUrl).pathname.split("/").filter(Boolean);
    const i = parts.indexOf("embed");
    const id = i >= 0 ? parts[i + 1] : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    const m = /\/embed\/([a-zA-Z0-9_-]{11})/.exec(embedUrl);
    return m?.[1] ?? null;
  }
}

export function twitchLoginFromEmbedUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  try {
    const u = new URL(embedUrl);
    const channel = u.searchParams.get("channel")?.trim();
    if (channel) return channel;
  } catch {
    /* ignore */
  }
  return null;
}

export function resolvePlayerStillThumb(opts: {
  posterUrl?: string | null;
  provider?: string | null;
  embedUrl?: string | null;
  externalId?: string | null;
}): string | null {
  const poster = opts.posterUrl?.trim() || null;
  if (poster) return poster;
  const provider = (opts.provider ?? "").toUpperCase();
  const id = opts.externalId?.trim() || "";
  if (provider === "YOUTUBE" || !provider) {
    const yt = id || youtubeIdFromEmbedUrl(opts.embedUrl);
    if (yt) return youtubeStillThumb(yt);
  }
  if (provider === "TWITCH") {
    const login = id || twitchLoginFromEmbedUrl(opts.embedUrl) || "";
    return login ? twitchStillThumb(login) : null;
  }
  return null;
}
