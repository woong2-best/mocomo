const MAX_MEMORY = 500;
const MAX_IDB = 800;
const DB_NAME = "mocomo_client_translate";
const STORE = "translations";
const DB_VERSION = 1;

export type CachedTranslation = {
  translated: string;
  sourceLang: string | null;
  sourceNllb: string;
};

type StoredEntry = CachedTranslation & { at: number };

const memory = new Map<string, StoredEntry>();

function cacheKey(kind: string, srcLang: string, tgtLang: string, text: string): string {
  return `${kind}:${srcLang}:${tgtLang}:${text}`;
}

function remember(key: string, entry: StoredEntry): void {
  if (memory.size >= MAX_MEMORY) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(key, entry);
}

export function getCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string
): string | null {
  return memory.get(cacheKey("chunk", srcLang, tgtLang, text))?.translated ?? null;
}

export function setCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string,
  translated: string
): void {
  remember(cacheKey("chunk", srcLang, tgtLang, text), {
    translated,
    sourceLang: null,
    sourceNllb: srcLang,
    at: Date.now(),
  });
}

export function getCachedFullTranslation(
  srcLang: string,
  tgtLang: string,
  text: string
): CachedTranslation | null {
  const hit = memory.get(cacheKey("full", srcLang, tgtLang, text));
  if (!hit) return null;
  return {
    translated: hit.translated,
    sourceLang: hit.sourceLang,
    sourceNllb: hit.sourceNllb,
  };
}

export function setCachedFullTranslation(
  srcLang: string,
  tgtLang: string,
  text: string,
  value: CachedTranslation
): void {
  const entry: StoredEntry = { ...value, at: Date.now() };
  const key = cacheKey("full", srcLang, tgtLang, text);
  remember(key, entry);
  void persistFullTranslation(key, entry);
}

export async function getCachedFullTranslationAsync(
  srcLang: string,
  tgtLang: string,
  text: string
): Promise<CachedTranslation | null> {
  const fromMemory = getCachedFullTranslation(srcLang, tgtLang, text);
  if (fromMemory) return fromMemory;

  const key = cacheKey("full", srcLang, tgtLang, text);
  const stored = await readIdb(key);
  if (!stored?.translated) return null;
  remember(key, stored);
  return {
    translated: stored.translated,
    sourceLang: stored.sourceLang,
    sourceNllb: stored.sourceNllb,
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE);
        store.createIndex("at", "at");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readIdb(key: string): Promise<StoredEntry | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const row = await new Promise<StoredEntry | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const get = tx.objectStore(STORE).get(key);
      get.onsuccess = () => resolve((get.result as StoredEntry | undefined) ?? null);
      get.onerror = () => reject(get.error);
    });
    db.close();
    return row;
  } catch {
    return null;
  }
}

async function persistFullTranslation(key: string, entry: StoredEntry): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.put(entry, key);
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result <= MAX_IDB) return;
        const extras = countReq.result - MAX_IDB + 50;
        let deleted = 0;
        const cursorReq = store.index("at").openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor || deleted >= extras) return;
          cursor.delete();
          deleted += 1;
          cursor.continue();
        };
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* quota / private mode */
  }
}
