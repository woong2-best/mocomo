export type GiphyCreator = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type CommentGifMeta = {
  source: "giphy";
  id?: string;
  title: string | null;
  user: GiphyCreator | null;
};

const USERNAME_RE = /^[A-Za-z0-9._-]{1,64}$/;
const JUNK_TITLE = new Set(["gif", "gifs", "giphy", "sticker", "stickers", "by"]);

function isGiphyHttpsUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "giphy.com" || host.endsWith(".giphy.com");
  } catch {
    return false;
  }
}

function clip(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseGiphyCreator(raw: unknown): GiphyCreator | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const username = typeof row.username === "string" ? row.username.trim() : "";
  if (!USERNAME_RE.test(username)) return null;
  const displayRaw =
    (typeof row.displayName === "string" && row.displayName) ||
    (typeof row.display_name === "string" && row.display_name) ||
    username;
  const avatarRaw =
    (typeof row.avatarUrl === "string" && row.avatarUrl) ||
    (typeof row.avatar_url === "string" && row.avatar_url) ||
    "";
  const avatar = avatarRaw.trim();
  return {
    username,
    displayName: clip(displayRaw, 80) || username,
    avatarUrl: avatar && isGiphyHttpsUrl(avatar) ? avatar : null,
  };
}

export function parseCommentGifMeta(raw: unknown): CommentGifMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title =
    typeof row.title === "string" && row.title.trim()
      ? clip(row.title, 200)
      : null;
  const id = typeof row.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(row.id.trim())
    ? row.id.trim()
    : undefined;
  const user = parseGiphyCreator(row.user);
  if (!title && !user && !id) return null;
  return { source: "giphy", id, title, user };
}

export function gifTitleKeywords(title: string | null | undefined): string[] {
  const raw = clip(title ?? "", 200);
  if (!raw) return [];
  const stripped = raw
    .replace(/\bgifs?\b/gi, " ")
    .replace(/\bby\s+.+$/i, " ")
    .trim();
  const parts = (stripped || raw)
    .split(/[,|/·•]+|\s[-–—]\s/)
    .map((part) => part.replace(/^[#\s]+|[#\s]+$/g, "").trim())
    .filter((part) => {
      if (part.length < 2 || part.length > 32) return false;
      return !JUNK_TITLE.has(part.toLowerCase());
    });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
    if (out.length >= 8) break;
  }
  return out;
}

export function giphyCreatorQuery(username: string): string {
  const value = username.trim().replace(/^@+/, "");
  return value ? `@${value}` : "";
}
