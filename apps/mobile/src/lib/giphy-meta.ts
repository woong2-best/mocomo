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

const JUNK_TITLE = new Set(["gif", "gifs", "giphy", "sticker", "stickers", "by"]);

export function parseCommentGifMeta(raw: unknown): CommentGifMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim().slice(0, 200) : null;
  const id =
    typeof row.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(row.id.trim()) ? row.id.trim() : undefined;
  const userRaw = row.user && typeof row.user === "object" ? (row.user as Record<string, unknown>) : null;
  const username = typeof userRaw?.username === "string" ? userRaw.username.trim() : "";
  const user =
    /^[A-Za-z0-9._-]{1,64}$/.test(username)
      ? {
          username,
          displayName:
            (typeof userRaw?.displayName === "string" && userRaw.displayName.trim()) ||
            (typeof userRaw?.display_name === "string" && userRaw.display_name.trim()) ||
            username,
          avatarUrl:
            typeof userRaw?.avatarUrl === "string"
              ? userRaw.avatarUrl
              : typeof userRaw?.avatar_url === "string"
                ? userRaw.avatar_url
                : null,
        }
      : null;
  if (!title && !user && !id) return null;
  return { source: "giphy", id, title, user };
}

export function gifTitleKeywords(title: string | null | undefined): string[] {
  const raw = (title ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  const stripped = raw.replace(/\bgifs?\b/gi, " ").replace(/\bby\s+.+$/i, " ").trim();
  const parts = (stripped || raw)
    .split(/[,|/·•]+|\s[-–—]\s/)
    .map((part) => part.replace(/^[#\s]+|[#\s]+$/g, "").trim())
    .filter((part) => part.length >= 2 && part.length <= 32 && !JUNK_TITLE.has(part.toLowerCase()));
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
