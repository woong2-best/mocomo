export const GIPHY_SEARCH_EVENT = "mocomo:giphy-search";

export function openGiphySearch(query: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GIPHY_SEARCH_EVENT, { detail: { query: query.trim() } })
  );
}

export function subscribeGiphySearch(onSearch: (query: string) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ query?: string }>).detail;
    onSearch(typeof detail?.query === "string" ? detail.query : "");
  };
  window.addEventListener(GIPHY_SEARCH_EVENT, handler);
  return () => window.removeEventListener(GIPHY_SEARCH_EVENT, handler);
}
