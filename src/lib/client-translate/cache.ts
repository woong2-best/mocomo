const MAX_ENTRIES = 500;

type CacheEntry = { translated: string; at: number };

const memory = new Map<string, CacheEntry>();

function cacheKey(source: string, srcLang: string, tgtLang: string, text: string): string {
  return `${source}:${srcLang}:${tgtLang}:${text}`;
}

export function getCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string
): string | null {
  const hit = memory.get(cacheKey("nllb", srcLang, tgtLang, text));
  return hit?.translated ?? null;
}

export function setCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string,
  translated: string
): void {
  if (memory.size >= MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(cacheKey("nllb", srcLang, tgtLang, text), {
    translated,
    at: Date.now(),
  });
}
