import { BLOCKED_HOSTS } from "@/lib/safe-link";

export type LinkifyPart =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "hashtag"; label: string; tag: string };

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;
/** Letters, numbers, underscore — CJK 등 비ASCII 포함 (Twitter 스타일) */
const HASHTAG_RE = /#[\w\u0080-\uFFFF]+/gu;

type TextToken =
  | { start: number; end: number; type: "link"; href: string; label: string; trailing: string }
  | { start: number; end: number; type: "hashtag"; label: string; tag: string };

export function hashtagSearchHref(label: string): string {
  const q = label.startsWith("#") ? label : `#${label}`;
  return `/search?q=${encodeURIComponent(q)}`;
}

export function isHashtagSearchQuery(q: string): boolean {
  return q.startsWith("#") && q.length > 1;
}

function splitTrailingPunctuation(raw: string): { core: string; trailing: string } {
  let core = raw;
  let trailing = "";
  while (core.length > 0 && /[.,;:!?)\]}>'"]$/.test(core)) {
    trailing = core.slice(-1) + trailing;
    core = core.slice(0, -1);
  }
  return { core, trailing };
}

export function normalizeUserLink(raw: string): string | null {
  let candidate = raw.trim();
  if (candidate.startsWith("www.")) candidate = `https://${candidate}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (BLOCKED_HOSTS.some((h) => u.hostname.endsWith(h))) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function isExternalHref(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function collectTextTokens(text: string): TextToken[] {
  const tokens: TextToken[] = [];

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const { core, trailing } = splitTrailingPunctuation(raw);
    const href = normalizeUserLink(core);
    if (href) {
      tokens.push({
        start,
        end: start + core.length,
        type: "link",
        href,
        label: core,
        trailing,
      });
    }
  }

  for (const match of text.matchAll(HASHTAG_RE)) {
    const start = match.index ?? 0;
    const label = match[0];
    const tag = label.slice(1);
    if (!tag) continue;
    tokens.push({ start, end: start + label.length, type: "hashtag", label, tag });
  }

  tokens.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: TextToken[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const spanEnd = token.type === "link" ? token.end + token.trailing.length : token.end;
    if (token.start < cursor) continue;
    merged.push(token);
    cursor = spanEnd;
  }
  return merged;
}

export function parseLinkifyParts(text: string): LinkifyPart[] {
  if (!text) return [];

  const tokens = collectTextTokens(text);
  if (tokens.length === 0) return [{ type: "text", value: text }];

  const parts: LinkifyPart[] = [];
  let last = 0;

  for (const token of tokens) {
    if (token.start > last) parts.push({ type: "text", value: text.slice(last, token.start) });

    if (token.type === "link") {
      parts.push({ type: "link", href: token.href, label: token.label });
      if (token.trailing) parts.push({ type: "text", value: token.trailing });
      last = token.end + token.trailing.length;
    } else {
      parts.push({ type: "hashtag", label: token.label, tag: token.tag });
      last = token.end;
    }
  }

  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
