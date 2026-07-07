import type { EditorProject, SavedEditorProject } from "@/lib/media-editor/types";

const DB_NAME = "mocomo-media-editor";
const STORE = "projects";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "meta.id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveEditorProject(project: SavedEditorProject): Promise<void> {
  const db = await openDb();
  const payload: SavedEditorProject = {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadEditorProject(id: string): Promise<SavedEditorProject | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as SavedEditorProject) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listEditorProjects(): Promise<SavedEditorProject[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as SavedEditorProject[]).sort(
        (a, b) => new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime()
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEditorProject(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function downloadProjectJson(project: EditorProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.meta.title || "mocomo-edit"}.mocomo.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseProjectJsonFile(file: File): Promise<EditorProject> {
  const text = await file.text();
  const parsed = JSON.parse(text) as EditorProject;
  if (!parsed.version || !parsed.layers) throw new Error("Invalid project file");
  return parsed;
}
