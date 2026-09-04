/** Append a cache-bust query param so Chrome can reload after unload/retry. */
export function withVideoCacheBust(src: string, token: number): string {
  if (!src || token <= 0) return src;
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;

  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://mocomo.local";
    const u = new URL(src, base);
    u.searchParams.set("_mv", String(token));
    return u.toString();
  } catch {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}_mv=${token}`;
  }
}
