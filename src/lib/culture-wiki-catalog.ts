export const CULTURE_WIKI_CATALOG_PAGE_SIZE = 16;

export function cultureWikiCatalogTotalPages(totalCount: number): number {
  return Math.max(1, Math.ceil(totalCount / CULTURE_WIKI_CATALOG_PAGE_SIZE));
}

export function cultureWikiHubListHref(options: {
  genre?: string | null;
  q?: string | null;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (options.genre) params.set("genre", options.genre);
  const q = options.q?.trim();
  if (q) params.set("q", q);
  const page = options.page ?? 1;
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/anime?${qs}` : "/anime";
}
