import { normalizeUserLink, parseLinkifyParts } from "@/lib/linkify";
import { BLOCKED_HOSTS } from "@/lib/safe-link";

export type LinkPreviewData = {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  provider: "youtube" | "og";
};

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

/** SSRF: only public http(s) hosts */
export function isSafePreviewUrl(raw: string): URL | null {
  const href = normalizeUserLink(raw);
  if (!href) return null;
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    if (!host || PRIVATE_HOSTS.has(host)) return null;
    if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
      return null;
    }
    if (BLOCKED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
    if (isPrivateIpv4(host)) return null;
    if (host.includes(":")) return null; // block raw IPv6
    return u;
  } catch {
    return null;
  }
}

export function extractFirstHttpUrl(text: string): string | null {
  if (!text?.trim()) return null;
  for (const part of parseLinkifyParts(text)) {
    if (part.type === "link") return part.href;
  }
  return null;
}

/** True when body is only whitespace + a single URL (Twitter-style card-only posts). */
export function isUrlOnlyContent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const url = extractFirstHttpUrl(trimmed);
  if (!url) return false;
  const withoutUrl = trimmed
    .replace(/(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi, "")
    .replace(/[.,;:!?)\]}>'"]+$/g, "")
    .trim();
  return withoutUrl.length === 0;
}

export function previewDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
