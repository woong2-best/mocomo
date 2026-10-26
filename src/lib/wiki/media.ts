import { parseVideoEmbed } from "@/lib/studio-portfolio";

export type WikiVideo =
  | {
      kind: "youtube";
      id: string;
      url: string;
      thumbnail: string;
      embedSrc: string;
    }
  | {
      kind: "vimeo";
      id: string;
      url: string;
      embedSrc: string;
    }
  | {
      kind: "file";
      url: string;
    };

const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i;
const VIDEO_TAG_RE = /^\[(?:youtube:([a-zA-Z0-9_-]{6,})|Video:\s*(.+))\]$/i;
const MARKDOWN_LINK_RE = /^\[([^\]]*)\]\(([^)]+)\)$/;
const URL_IN_TEXT_RE = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;
const VIDEO_TOKEN_RE =
  /\[youtube:([a-zA-Z0-9_-]{6,})\]|\[Video:\s*([^\]]+)\]|(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

function youtubeVideo(id: string): WikiVideo {
  return {
    kind: "youtube",
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    embedSrc: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  };
}

function vimeoVideo(id: string): WikiVideo {
  return {
    kind: "vimeo",
    id,
    url: `https://vimeo.com/${id}`,
    embedSrc: `https://player.vimeo.com/video/${id}`,
  };
}

function trimUrlPunctuation(raw: string): string {
  let core = raw.trim();
  while (core.length > 0 && /[.,;:!?)\]}>'"]$/.test(core)) {
    core = core.slice(0, -1);
  }
  return core;
}

function isHttpsVideoFile(raw: string): boolean {
  try {
    const href = raw.startsWith("www.") ? `https://${raw}` : raw;
    const parsed = new URL(href);
    if (parsed.protocol !== "https:") return false;
    return VIDEO_FILE_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function parseWikiVideoUrl(raw: string): WikiVideo | null {
  const text = trimUrlPunctuation(raw);
  if (!text) return null;

  const embed = parseVideoEmbed(text);
  if (embed?.provider === "youtube") return youtubeVideo(embed.videoId);
  if (embed?.provider === "vimeo") return vimeoVideo(embed.videoId);
  if (isHttpsVideoFile(text)) {
    return { kind: "file", url: text.startsWith("www.") ? `https://${text}` : text };
  }
  return null;
}

/** A line that is only a video URL, `[youtube:id]`, `[Video: url]`, or a markdown video link. */
export function parseWikiVideoLine(line: string): WikiVideo | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const tagged = trimmed.match(VIDEO_TAG_RE);
  if (tagged) {
    if (tagged[1]) return youtubeVideo(tagged[1]);
    if (tagged[2]) return parseWikiVideoUrl(tagged[2]);
    return null;
  }

  const markdown = trimmed.match(MARKDOWN_LINK_RE);
  if (markdown?.[2] && !trimmed.startsWith("![")) {
    const embed = parseWikiVideoUrl(markdown[2]);
    if (embed) return embed;
  }

  if (trimmed.includes(" ")) return null;
  return parseWikiVideoUrl(trimmed);
}

export function extractWikiVideos(text: string): WikiVideo[] {
  const videos: WikiVideo[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(VIDEO_TOKEN_RE)) {
    const raw = match[0];
    const video = match[1]
      ? youtubeVideo(match[1])
      : match[2]
        ? parseWikiVideoUrl(match[2])
        : parseWikiVideoUrl(raw);
    if (!video) continue;
    const key = video.kind === "file" ? video.url : `${video.kind}:${video.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    videos.push(video);
  }

  return videos;
}

export function extractBareUrls(text: string): string[] {
  return [...text.matchAll(URL_IN_TEXT_RE)].map((match) => trimUrlPunctuation(match[0]));
}

export function wikiVideoLink(source: string, fallbackHref: string): { href: string; label: string } {
  const trimmed = source.trim();
  const markdown = trimmed.match(MARKDOWN_LINK_RE);
  if (markdown && !trimmed.startsWith("![")) {
    const href = markdown[2].trim() || fallbackHref;
    const label = markdown[1].trim() || href;
    return { href, label };
  }
  const tagged = trimmed.match(VIDEO_TAG_RE);
  if (tagged?.[2]) {
    const href = tagged[2].trim();
    return { href, label: href };
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("www.")) {
    return {
      href: trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed,
      label: trimmed,
    };
  }
  return { href: fallbackHref, label: fallbackHref };
}
