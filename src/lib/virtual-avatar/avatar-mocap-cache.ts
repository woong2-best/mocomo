"use client";

const DB_NAME = "mocomo_avatar_mocap_cache";
const STORE = "files";
const BVH_KEY = "last_bvh";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheBvhFile(file: File): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    const text = await file.text();
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ name: file.name, text, savedAt: Date.now() }, BVH_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function loadCachedBvhText(): Promise<string | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const row = await new Promise<{ text?: string } | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const get = tx.objectStore(STORE).get(BVH_KEY);
      get.onsuccess = () => resolve((get.result as { text?: string } | undefined) ?? null);
      get.onerror = () => reject(get.error);
    });
    db.close();
    return row?.text ?? null;
  } catch {
    return null;
  }
}
