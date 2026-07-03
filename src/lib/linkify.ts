import { BLOCKED_HOSTS } from "@/lib/safe-link";

export type LinkifyPart =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

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

export function parseLinkifyParts(text: string): LinkifyPart[] {
  if (!text) return [];

  const parts: LinkifyPart[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const raw = match[0];
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });

    const { core, trailing } = splitTrailingPunctuation(raw);
    const href = normalizeUserLink(core);
    if (href) {
      parts.push({ type: "link", href, label: core });
      if (trailing) parts.push({ type: "text", value: trailing });
    } else {
      parts.push({ type: "text", value: raw });
    }
    last = start + raw.length;
  }

  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
