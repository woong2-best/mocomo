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

const WIKI_EDITOR_IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

export type WikiEditorMedia = {
  kind: "image" | "video";
  snippet: string;
  url: string;
  thumb?: string;
  alt?: string;
};

export type WikiEditorPart =
  | { type: "text"; value: string }
  | { type: "media"; item: WikiEditorMedia };

type MediaSpan = { start: number; end: number; item: WikiEditorMedia };

function wikiEditorMediaFromSnippet(snippet: string): WikiEditorMedia | null {
  const trimmed = snippet.trim();
  if (!trimmed) return null;
  const image = trimmed.match(new RegExp(WIKI_EDITOR_IMAGE_RE.source));
  if (image) {
    return {
      kind: "image",
      snippet: image[0],
      url: image[2],
      thumb: image[2],
      alt: image[1],
    };
  }
  const video = parseWikiVideoLine(trimmed);
  if (!video) return null;
  return {
    kind: "video",
    snippet: trimmed,
    url: video.url,
    thumb: video.kind === "youtube" ? video.thumbnail : undefined,
  };
}

function findWikiEditorMediaSpans(source: string): MediaSpan[] {
  const spans: MediaSpan[] = [];
  const imageRe = new RegExp(WIKI_EDITOR_IMAGE_RE.source, "g");
  for (const match of source.matchAll(imageRe)) {
    const start = match.index ?? 0;
    spans.push({
      start,
      end: start + match[0].length,
      item: {
        kind: "image",
        snippet: match[0],
        url: match[2],
        thumb: match[2],
        alt: match[1],
      },
    });
  }

  let offset = 0;
  for (const line of source.split("\n")) {
    const start = offset;
    const end = start + line.length;
    offset = end + 1;
    if (spans.some((span) => span.start < end && span.end > start)) continue;
    const video = parseWikiVideoLine(line);
    if (!video) continue;
    const trimmed = line.trim();
    const lead = line.indexOf(trimmed);
    spans.push({
      start: start + Math.max(0, lead),
      end: start + Math.max(0, lead) + trimmed.length,
      item: {
        kind: "video",
        snippet: trimmed,
        url: video.url,
        thumb: video.kind === "youtube" ? video.thumbnail : undefined,
      },
    });
  }

  return spans.sort((a, b) => a.start - b.start);
}

export function extractWikiEditorMedia(source: string): WikiEditorMedia[] {
  return findWikiEditorMediaSpans(source).map((span) => span.item);
}

export function splitWikiEditorParts(source: string): WikiEditorPart[] {
  const spans = findWikiEditorMediaSpans(source);
  const parts: WikiEditorPart[] = [];
  let cursor = 0;
  for (const span of spans) {
    parts.push({ type: "text", value: source.slice(cursor, span.start) });
    parts.push({ type: "media", item: span.item });
    cursor = span.end;
  }
  parts.push({ type: "text", value: source.slice(cursor) });
  return parts;
}

export function joinWikiEditorParts(parts: WikiEditorPart[]): string {
  let out = "";
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.type === "text") {
      out += part.value;
      continue;
    }
    if (out && !out.endsWith("\n")) out += "\n";
    out += part.item.snippet;
    const next = parts[i + 1];
    if (next?.type === "text" && next.value && !next.value.startsWith("\n")) out += "\n";
    else if (next?.type === "media" && !out.endsWith("\n")) out += "\n";
  }
  return out;
}

export function replaceWikiEditorPartText(source: string, partIndex: number, value: string): string {
  const parts = splitWikiEditorParts(source);
  const part = parts[partIndex];
  if (!part || part.type !== "text") return source;
  parts[partIndex] = { type: "text", value };
  return joinWikiEditorParts(parts);
}

export function insertWikiEditorMediaInPart(
  source: string,
  partIndex: number,
  start: number,
  end: number,
  snippet: string
): string {
  const item = wikiEditorMediaFromSnippet(snippet);
  if (!item) return source;
  const parts = splitWikiEditorParts(source);
  const part = parts[partIndex];
  if (!part || part.type !== "text") {
    const base = source.replace(/\s+$/, "");
    return base ? `${base}\n${item.snippet}\n` : `${item.snippet}\n`;
  }
  const from = Math.max(0, Math.min(start, part.value.length));
  const to = Math.max(from, Math.min(end, part.value.length));
  const before = part.value.slice(0, from);
  const after = part.value.slice(to);
  const left = before && !before.endsWith("\n") ? `${before}\n` : before;
  const right = after && !after.startsWith("\n") ? `\n${after}` : after;
  return joinWikiEditorParts([
    ...parts.slice(0, partIndex),
    { type: "text", value: left },
    { type: "media", item },
    { type: "text", value: right },
    ...parts.slice(partIndex + 1),
  ]);
}

export function removeWikiEditorPart(source: string, partIndex: number): string {
  const parts = splitWikiEditorParts(source);
  if (parts[partIndex]?.type !== "media") return source;
  return joinWikiEditorParts(parts.filter((_, index) => index !== partIndex));
}

