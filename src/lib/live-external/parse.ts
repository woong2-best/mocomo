import type { LiveExternalProvider, ParsedExternalLiveSource } from "./types";

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const TWITCH_LOGIN = /^[a-zA-Z0-9_]{3,25}$/;
const CHZZK_CHANNEL = /^[a-zA-Z0-9]{20,40}$/;

function youtubeVideoId(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (YOUTUBE_ID.test(url)) return url;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id && YOUTUBE_ID.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const v = parsed.searchParams.get("v");
      if (v && YOUTUBE_ID.test(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      for (const key of ["embed", "live", "shorts"]) {
        const i = parts.indexOf(key);
        if (i >= 0 && parts[i + 1] && YOUTUBE_ID.test(parts[i + 1]!)) {
          return parts[i + 1]!;
        }
      }
      if (parts[0] === "channel" || parts[0] === "@") return null;
    }
  } catch {
    return null;
  }
  return null;
}

function twitchLogin(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (TWITCH_LOGIN.test(url) && !url.includes(".")) return url.toLowerCase();
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "twitch.tv" && host !== "m.twitch.tv") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "videos" || parts[0] === "clip" || parts[0] === "directory") {
      return null;
    }
    const login = parts[0]?.toLowerCase();
    return login && TWITCH_LOGIN.test(login) ? login : null;
  } catch {
    return null;
  }
  return null;
}

function chzzkChannelId(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (CHZZK_CHANNEL.test(url)) return url;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "chzzk.naver.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    // /live/{id} or /{channelId} or /embed/live/{id}
    if (parts[0] === "embed" && parts[1] === "live" && parts[2]) {
      return CHZZK_CHANNEL.test(parts[2]) ? parts[2] : parts[2];
    }
    if (parts[0] === "live" && parts[1]) return parts[1];
    if (parts[0] && !["category", "following", "search"].includes(parts[0])) {
      return parts[0];
    }
  } catch {
    return null;
  }
  return null;
}

/** Twitch parent domains (no protocol). Always include production + localhost for dev. */
export function twitchParentHosts(): string[] {
  const hosts = new Set<string>();
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) {
    try {
      hosts.add(new URL(app).hostname);
    } catch {
      /* ignore */
    }
  }
  hosts.add("mocomo.net");
  hosts.add("www.mocomo.net");
  hosts.add("localhost");
  return [...hosts];
}

export function buildYoutubeEmbedUrl(videoId: string): string {
  const q = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    autoplay: "1",
    playsinline: "1",
    // Needed so the viewer player can seek to the live head on join.
    enablejsapi: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${q}`;
}

/** Client-side: origin + JS API so we can snap DVR resume to the live edge. */
export function withYoutubeLiveEmbedParams(embedUrl: string, origin?: string | null): string {
  try {
    const u = new URL(embedUrl);
    u.searchParams.set("rel", "0");
    u.searchParams.set("modestbranding", "1");
    u.searchParams.set("autoplay", "1");
    u.searchParams.set("playsinline", "1");
    u.searchParams.set("enablejsapi", "1");
    if (origin) u.searchParams.set("origin", origin);
    return u.toString();
  } catch {
    return embedUrl;
  }
}

export function buildTwitchEmbedUrl(channelLogin: string, parents?: string[]): string {
  const q = new URLSearchParams();
  q.set("channel", channelLogin);
  q.set("autoplay", "true");
  for (const p of parents ?? twitchParentHosts()) {
    q.append("parent", p);
  }
  return `https://player.twitch.tv/?${q}`;
}

/** Documented pattern — may be blocked; UI must support open-external fallback. */
export function buildChzzkEmbedUrl(channelId: string): string {
  return `https://chzzk.naver.com/embed/live/${encodeURIComponent(channelId)}`;
}

export function parseExternalLiveSource(
  raw: string,
  opts?: { providerHint?: LiveExternalProvider }
): ParsedExternalLiveSource | { error: string } {
  const input = raw.trim();
  if (!input) return { error: "Enter a broadcast URL or ID." };

  const tryYoutube = () => {
    const id = youtubeVideoId(input);
    if (!id) return null;
    return {
      provider: "YOUTUBE" as const,
      externalId: id,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: buildYoutubeEmbedUrl(id),
      embedSupported: true,
    };
  };
  const tryTwitch = () => {
    const login = twitchLogin(input);
    if (!login) return null;
    return {
      provider: "TWITCH" as const,
      externalId: login,
      watchUrl: `https://www.twitch.tv/${login}`,
      embedUrl: buildTwitchEmbedUrl(login),
      embedSupported: true,
    };
  };
  const tryChzzk = () => {
    const id = chzzkChannelId(input);
    if (!id) return null;
    return {
      provider: "CHZZK" as const,
      externalId: id,
      watchUrl: `https://chzzk.naver.com/live/${id}`,
      embedUrl: buildChzzkEmbedUrl(id),
      /** verified at runtime / by probe — default optimistic, UI can fall back */
      embedSupported: true,
    };
  };

  const hint = opts?.providerHint;
  if (hint === "YOUTUBE") {
    return tryYoutube() ?? { error: "Not a valid YouTube live or video URL." };
  }
  if (hint === "TWITCH") {
    return tryTwitch() ?? { error: "Not a valid Twitch channel URL." };
  }
  if (hint === "CHZZK") {
    return tryChzzk() ?? { error: "Not a valid CHZZK channel URL." };
  }

  return (
    tryYoutube() ||
    tryTwitch() ||
    tryChzzk() || { error: "Only YouTube and Twitch URLs are supported." }
  );
}

export function resolveExternalEmbed(source: {
  externalProvider: string | null;
  externalId: string | null;
}): ParsedExternalLiveSource | null {
  if (!source.externalProvider || !source.externalId) return null;
  const provider = source.externalProvider.toUpperCase() as LiveExternalProvider;
  if (provider === "YOUTUBE") {
    return {
      provider,
      externalId: source.externalId,
      watchUrl: `https://www.youtube.com/watch?v=${source.externalId}`,
      embedUrl: buildYoutubeEmbedUrl(source.externalId),
      embedSupported: true,
    };
  }
  if (provider === "TWITCH") {
    return {
      provider,
      externalId: source.externalId,
      watchUrl: `https://www.twitch.tv/${source.externalId}`,
      embedUrl: buildTwitchEmbedUrl(source.externalId),
      embedSupported: true,
    };
  }
  if (provider === "CHZZK") {
    // Default on after Phase 1 probe (HTTP 200, no XFO). Force off with =false.
    const forced = process.env.NEXT_PUBLIC_CHZZK_EMBED_ENABLED?.trim();
    return {
      provider,
      externalId: source.externalId,
      watchUrl: `https://chzzk.naver.com/live/${source.externalId}`,
      embedUrl: buildChzzkEmbedUrl(source.externalId),
      embedSupported: forced !== "false",
    };
  }
  return null;
}
