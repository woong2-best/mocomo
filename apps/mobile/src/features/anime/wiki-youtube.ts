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
const VIDEO_TOKEN_RE =
  /\[youtube:([a-zA-Z0-9_-]{6,})\]|\[Video:\s*([^\]]+)\]|(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;
const BARE_URL_RE = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

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

function parseVideoEmbed(raw: string): WikiVideo | null {
  const text = trimUrlPunctuation(raw);
  if (!text) return null;
  const yt = text.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i
  );
  if (yt?.[1]) return youtubeVideo(yt[1]);
  const vimeo = text.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/i);
  if (vimeo?.[1]) return vimeoVideo(vimeo[1]);
  try {
    const href = text.startsWith("www.") ? `https://${text}` : text;
    const parsed = new URL(href);
    if (parsed.protocol === "https:" && VIDEO_FILE_RE.test(parsed.pathname)) {
      return { kind: "file", url: href };
    }
  } catch {
    return null;
  }
  return null;
}

export function extractYoutubeId(line: string): string | null {
  const video = parseWikiVideoLine(line);
  if (video?.kind === "youtube") return video.id;
  const url = line.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i
  );
  return url?.[1] ?? null;
}

export function parseWikiVideoLine(line: string): WikiVideo | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const tagged = trimmed.match(VIDEO_TAG_RE);
  if (tagged) {
    if (tagged[1]) return youtubeVideo(tagged[1]);
    if (tagged[2]) return parseVideoEmbed(tagged[2]);
    return null;
  }

  const markdown = trimmed.match(MARKDOWN_LINK_RE);
  if (markdown?.[2] && !trimmed.startsWith("![")) {
    const embed = parseVideoEmbed(markdown[2]);
    if (embed) return embed;
  }

  if (trimmed.includes(" ")) return null;
  return parseVideoEmbed(trimmed);
}

export function extractWikiVideos(text: string): WikiVideo[] {
  const videos: WikiVideo[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(VIDEO_TOKEN_RE)) {
    const video = match[1]
      ? youtubeVideo(match[1])
      : match[2]
        ? parseVideoEmbed(match[2])
        : parseVideoEmbed(match[0]);
    if (!video) continue;
    const key = video.kind === "file" ? video.url : `${video.kind}:${video.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    videos.push(video);
  }
  return videos;
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

export function splitAutolinkParts(text: string): Array<{ type: "text"; value: string } | { type: "link"; href: string; label: string }> {
  const parts: Array<{ type: "text"; value: string } | { type: "link"; href: string; label: string }> = [];
  let last = 0;
  for (const match of text.matchAll(BARE_URL_RE)) {
    const start = match.index ?? 0;
    const core = trimUrlPunctuation(match[0]);
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    const href = core.startsWith("www.") ? `https://${core}` : core;
    parts.push({ type: "link", href, label: core });
    last = start + core.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
