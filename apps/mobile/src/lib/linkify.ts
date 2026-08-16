/** Mobile linkify — aligned with web `src/lib/linkify.ts`. */

const BLOCKED_HOSTS = ["example.com", "example.org", "example.net", "placehold.co"];

export type LinkifyPart =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "hashtag"; label: string; tag: string }
  | { type: "mention"; label: string; username: string };

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;
const HASHTAG_RE = /#[\w\u0080-\uFFFF]+/gu;
const MENTION_RE = /(?<![A-Za-z0-9_])@[A-Za-z0-9_]{3,20}(?![A-Za-z0-9_])/g;

type TextToken =
  | { start: number; end: number; type: "link"; href: string; label: string; trailing: string }
  | { start: number; end: number; type: "hashtag"; label: string; tag: string }
  | { start: number; end: number; type: "mention"; label: string; username: string };

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

  for (const match of text.matchAll(MENTION_RE)) {
    const start = match.index ?? 0;
    const label = match[0];
    const username = label.slice(1);
    if (!username) continue;
    tokens.push({ start, end: start + label.length, type: "mention", label, username });
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
    } else if (token.type === "hashtag") {
      parts.push({ type: "hashtag", label: token.label, tag: token.tag });
      last = token.end;
    } else {
      parts.push({ type: "mention", label: token.label, username: token.username });
      last = token.end;
    }
  }

  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
