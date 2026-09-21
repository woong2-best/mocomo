/** Mirror of web `wikiLinkSlug` / `animeSlugFromTitle` for culture-wiki links. */
export function wikiLinkSlug(title: string): string {
  const raw = title.trim();
  if (!raw) return "anime";
  const ascii = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii.length >= 2) return ascii;
  // Hangul / CJK titles without Latin fallback — keep a stable short token
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  return `a-${(hash >>> 0).toString(36)}`;
}
