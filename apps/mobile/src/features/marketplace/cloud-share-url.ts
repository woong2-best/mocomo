/** Whitelisted cloud hosts. File bytes stay on Google Drive / Dropbox. */
const CLOUD_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "dropbox.com",
  "www.dropbox.com",
  "dl.dropboxusercontent.com",
]);

export const CLOUD_SHARE_URL_PATTERN =
  /^https:\/\/(?:drive\.google\.com|docs\.google\.com|(?:www\.)?dropbox\.com|dl\.dropboxusercontent\.com)\/\S+$/i;

export type CloudShareCheck =
  | { ok: true; href: string; provider: "google" | "dropbox" }
  | { ok: false };

function googleDriveFileId(url: URL): string | null {
  const fromPath = url.pathname.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (fromPath?.[1]) return fromPath[1];
  const id = url.searchParams.get("id");
  if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return id;
  return null;
}

export function validateCloudShareUrl(raw: string): CloudShareCheck {
  const trimmed = raw.trim();
  if (!CLOUD_SHARE_URL_PATTERN.test(trimmed)) return { ok: false };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false };
  }
  if (url.protocol !== "https:" || url.username || url.password) return { ok: false };
  const host = url.hostname.toLowerCase();
  if (!CLOUD_HOSTS.has(host)) return { ok: false };
  if (host === "drive.google.com" || host === "docs.google.com") {
    if (!googleDriveFileId(url)) return { ok: false };
    return { ok: true, href: url.toString(), provider: "google" };
  }
  if (url.pathname === "/" || url.pathname.length < 2) return { ok: false };
  return { ok: true, href: url.toString(), provider: "dropbox" };
}
