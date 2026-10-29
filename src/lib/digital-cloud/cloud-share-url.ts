/** Whitelisted cloud hosts. File bytes are never uploaded to MoCoMo. */
const CLOUD_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "dropbox.com",
  "www.dropbox.com",
  "dl.dropboxusercontent.com",
]);

/**
 * https only, and only Google Drive / Dropbox.
 * Hosts are matched exactly so lookalike domains are rejected.
 */
export const CLOUD_SHARE_URL_PATTERN =
  /^https:\/\/(?:drive\.google\.com|docs\.google\.com|(?:www\.)?dropbox\.com|dl\.dropboxusercontent\.com)\/\S+$/i;

const SHA256_RE = /^[a-f0-9]{64}$/;
const MD5_RE = /^[a-f0-9]{32}$/;

export type CloudShareCheck =
  | { ok: true; href: string; provider: "google" | "dropbox"; fileId?: string }
  | { ok: false; error: string };

export function googleDriveFileId(url: URL): string | null {
  const fromPath = url.pathname.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (fromPath?.[1]) return fromPath[1];
  const id = url.searchParams.get("id");
  if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return id;
  return null;
}

export function validateCloudShareUrl(raw: string): CloudShareCheck {
  const trimmed = raw.trim();
  if (!CLOUD_SHARE_URL_PATTERN.test(trimmed)) {
    return { ok: false, error: "Use an https Google Drive or Dropbox link." };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Use an https Google Drive or Dropbox link." };
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return { ok: false, error: "Use an https Google Drive or Dropbox link." };
  }
  const host = url.hostname.toLowerCase();
  if (!CLOUD_HOSTS.has(host)) {
    return { ok: false, error: "Use an https Google Drive or Dropbox link." };
  }
  if (host === "drive.google.com" || host === "docs.google.com") {
    const fileId = googleDriveFileId(url);
    if (!fileId) return { ok: false, error: "That Google Drive link is missing a file id." };
    return { ok: true, href: url.toString(), provider: "google", fileId };
  }
  if (url.pathname === "/" || url.pathname.length < 2) {
    return { ok: false, error: "That Dropbox link is missing a file path." };
  }
  return { ok: true, href: url.toString(), provider: "dropbox" };
}

export function normalizeSha256(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? "";
  return SHA256_RE.test(value) ? value : null;
}

export function normalizeMd5(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? "";
  return MD5_RE.test(value) ? value : null;
}

/**
 * True when a declared hash disagrees with a known hash of the same algorithm.
 * A missing hash is not a mismatch. A malformed hash is rejected by the caller.
 */
export function fileHashMismatch(
  expected: string | null | undefined,
  actual: string | null | undefined
): boolean {
  const expectedSha = normalizeSha256(expected);
  const actualSha = normalizeSha256(actual);
  if (expectedSha && actualSha) return expectedSha !== actualSha;
  const expectedMd5 = normalizeMd5(expected);
  const actualMd5 = normalizeMd5(actual);
  if (expectedMd5 && actualMd5) return expectedMd5 !== actualMd5;
  return false;
}
