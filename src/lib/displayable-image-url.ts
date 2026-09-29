/**
 * Profile/media URLs that a browser can actually load.
 * Device URIs (`file:`, `content:`, `ph:`) pass Zod `.url()` but break on the web.
 */
export function isPublicHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const raw = value.trim();
  if (!raw) return false;
  if (raw.startsWith("/") && !raw.startsWith("//")) return true;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol !== "http:") return false;
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function displayableImageUrl(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const raw = value.trim();
  return isPublicHttpUrl(raw) ? raw : null;
}
