export type CommentMediaKind = "NONE" | "PHOTO" | "GIF";
export type CommentMediaStored = "PHOTO" | "GIF";

export type CommentMediaPayload = {
  mediaType: CommentMediaKind;
  mediaUrl: string | null;
};

const MAX_URL = 2048;

const TENOR_HOSTS = new Set(["media.tenor.com", "c.tenor.com", "media1.tenor.com", "media.tenor.co"]);

export function serializeCommentMedia(row: {
  mediaType?: "PHOTO" | "GIF" | null;
  mediaUrl?: string | null;
}): CommentMediaPayload {
  const url = row.mediaUrl?.trim() ?? "";
  if ((row.mediaType === "PHOTO" || row.mediaType === "GIF") && url) {
    return { mediaType: row.mediaType, mediaUrl: url };
  }
  return { mediaType: "NONE", mediaUrl: null };
}

export function isTenorMediaUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (TENOR_HOSTS.has(host)) return true;
  return host.endsWith(".tenor.com") || host.endsWith(".tenor.co");
}

export function isCommentPhotoUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value || value.length > MAX_URL) return false;
  if (value.startsWith("/")) {
    return value.startsWith("/uploads/") || value.startsWith("/storage/");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host.endsWith(".supabase.co") && parsed.pathname.includes("/storage/v1/object/public/")) {
    return true;
  }
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) {
    try {
      if (new URL(app).hostname.toLowerCase() === host) return true;
    } catch {
      /* ignore */
    }
  }
  if (host === "mocomo.net" || host === "www.mocomo.net" || host === "app.mocomo.net") return true;
  const s3 = process.env.S3_PUBLIC_URL?.trim();
  if (s3) {
    try {
      if (new URL(s3).hostname.toLowerCase() === host) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function isCommentGifPlaybackUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(mp4|webm)(\?|$)/.test(lower) || lower.includes("/mp4") || lower.includes("/webm");
}

export function parseCommentMediaInput(body: {
  content?: unknown;
  mediaType?: unknown;
  mediaUrl?: unknown;
  media_type?: unknown;
  media_url?: unknown;
}): { ok: true; content: string; mediaType: CommentMediaStored | null; mediaUrl: string | null } | { ok: false; error: string } {
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (content.length > 4000) return { ok: false, error: "Check your comment content." };

  const rawType = body.mediaType ?? body.media_type;
  const rawUrl = body.mediaUrl ?? body.media_url;
  const type =
    rawType === "PHOTO" || rawType === "GIF" || rawType === "NONE"
      ? rawType
      : rawType == null || rawType === ""
        ? "NONE"
        : null;
  if (type == null) return { ok: false, error: "Invalid media type." };

  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (type === "NONE" || !url) {
    if (!content) return { ok: false, error: "Check your comment content." };
    return { ok: true, content, mediaType: null, mediaUrl: null };
  }
  if (url.length > MAX_URL) return { ok: false, error: "Media URL is too long." };
  if (type === "PHOTO" && !isCommentPhotoUrl(url)) {
    return { ok: false, error: "That photo could not be attached." };
  }
  if (type === "GIF" && !isTenorMediaUrl(url)) {
    return { ok: false, error: "That GIF could not be attached." };
  }
  return { ok: true, content, mediaType: type, mediaUrl: url };
}
