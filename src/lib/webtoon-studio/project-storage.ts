import type { StudioProject } from "@/lib/webtoon-studio/types";
import { STORAGE_DB, STORAGE_STORE } from "@/lib/webtoon-studio/constants";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(STORAGE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORAGE_STORE)) {
        db.createObjectStore(STORAGE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listStudioProjects(): Promise<StudioProject[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_STORE, "readonly");
    const store = tx.objectStore(STORAGE_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as StudioProject[]).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveStudioProject(project: StudioProject): Promise<void> {
  const db = await openDb();
  const payload = { ...project, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_STORE, "readwrite");
    tx.objectStore(STORAGE_STORE).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadStudioProject(id: string): Promise<StudioProject | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_STORE, "readonly");
    const req = tx.objectStore(STORAGE_STORE).get(id);
    req.onsuccess = () => resolve((req.result as StudioProject) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteStudioProject(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_STORE, "readwrite");
    tx.objectStore(STORAGE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
