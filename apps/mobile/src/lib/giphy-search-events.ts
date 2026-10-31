type Handler = (query: string) => void;

const handlers = new Set<Handler>();

export function openGiphySearch(query: string) {
  const next = query.trim();
  handlers.forEach((handler) => handler(next));
}

export function subscribeGiphySearch(handler: Handler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}
