import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "mocomo_translate:";
const MAX_ENTRIES = 400;

const memory = new Map<string, string>();
const order: string[] = [];

function storageKey(srcLang: string, tgtLang: string, text: string): string {
  return `${PREFIX}${srcLang}:${tgtLang}:${text}`;
}

function remember(key: string, translated: string): void {
  if (!memory.has(key)) order.push(key);
  memory.set(key, translated);
  if (order.length <= MAX_ENTRIES) return;
  const drop = order.splice(0, order.length - MAX_ENTRIES);
  const stale: string[] = [];
  for (const old of drop) {
    memory.delete(old);
    stale.push(old);
  }
  void AsyncStorage.multiRemove(stale);
}

export async function getCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string
): Promise<string | null> {
  const key = storageKey(srcLang, tgtLang, text);
  const hit = memory.get(key);
  if (hit !== undefined) return hit;
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored != null) remember(key, stored);
    return stored;
  } catch {
    return null;
  }
}

export function setCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string,
  translated: string
): void {
  const key = storageKey(srcLang, tgtLang, text);
  remember(key, translated);
  void AsyncStorage.setItem(key, translated).catch(() => {
    /* ignore cache write failures */
  });
}
