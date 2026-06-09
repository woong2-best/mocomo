"use client";

import type { Flat2dAvatarMeta, Flat2dAvatarSource } from "@/lib/avatar-2d/types";

export const AVATAR_2D_CHANGED_EVENT = "mocomo-avatar-2d-changed";

export function notifyAvatar2dChanged() {
  window.dispatchEvent(new Event(AVATAR_2D_CHANGED_EVENT));
}

export const MOCOMO_2D_LIBRARY_NAME = "MoCoMo 2D Library";
const LIBRARY_KEY = "mocomo_2d_library_v1";
const LEGACY_META_KEY = "mocomo_avatar_2d_meta_v1";
const DB_NAME = "mocomo-avatar-2d";
const DB_VERSION = 1;
const STORE = "images";

export type Flat2dLibraryCharacterEntry = {
  id: string;
  name: string;
  width: number;
  height: number;
  source: Flat2dAvatarSource;
  cloudUrl?: string;
  createdAt: string;
};

type MoCoMo2dLibraryIndex = {
  version: 1;
  name: typeof MOCOMO_2D_LIBRARY_NAME;
  createdAt: string;
  characters: Flat2dLibraryCharacterEntry[];
  activeId: string | null;
};

function charBlobKey(id: string) {
  return `char_${id}`;
}

function thumbBlobKey(id: string) {
  return `thumb_${id}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putBlob(key: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

function readIndex(): MoCoMo2dLibraryIndex | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LIBRARY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MoCoMo2dLibraryIndex;
  } catch {
    return null;
  }
}

function writeIndex(index: MoCoMo2dLibraryIndex) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(index));
}

function ensureLibraryIndex(): MoCoMo2dLibraryIndex {
  let index = readIndex();
  if (!index) {
    index = {
      version: 1,
      name: MOCOMO_2D_LIBRARY_NAME,
      createdAt: new Date().toISOString(),
      characters: [],
      activeId: null,
    };
    writeIndex(index);
  }
  return index;
}

async function createThumbnail(pngBlob: Blob, max = 128): Promise<Blob> {
  const bitmap = await createImageBitmap(pngBlob);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return pngBlob;
  }
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const thumb = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return thumb ?? pngBlob;
}

/** 예전 단일 저장 → 라이브러리 1번 캐릭터로 이전 */
async function migrateLegacySingleAvatar(index: MoCoMo2dLibraryIndex) {
  if (index.characters.length > 0) return index;
  const legacyRaw = localStorage.getItem(LEGACY_META_KEY);
  if (!legacyRaw) return index;
  try {
    const legacy = JSON.parse(legacyRaw) as Flat2dAvatarMeta;
    const blob = await getBlob("avatar2d");
    if (!blob) return index;
    const id = crypto.randomUUID();
    await putBlob(charBlobKey(id), blob);
    await putBlob(thumbBlobKey(id), await createThumbnail(blob));
    const entry: Flat2dLibraryCharacterEntry = {
      id,
      name: "캐릭터 1",
      width: legacy.width,
      height: legacy.height,
      source: legacy.source,
      cloudUrl: legacy.cloudUrl,
      createdAt: legacy.registeredAt,
    };
    index.characters.push(entry);
    index.activeId = id;
    writeIndex(index);
    localStorage.removeItem(LEGACY_META_KEY);
  } catch {
    /* ignore */
  }
  return index;
}

export function getActiveLibraryCharacterId(): string | null {
  return readIndex()?.activeId ?? null;
}

export function hasLibraryCharacters(): boolean {
  const index = readIndex();
  return (index?.characters.length ?? 0) > 0;
}

export async function listLibraryCharacters(): Promise<
  (Flat2dLibraryCharacterEntry & { thumbUrl: string })[]
> {
  let index = ensureLibraryIndex();
  index = await migrateLegacySingleAvatar(index);
  const out: (Flat2dLibraryCharacterEntry & { thumbUrl: string })[] = [];
  for (const c of index.characters) {
    const thumb = await getBlob(thumbBlobKey(c.id));
    if (!thumb) continue;
    out.push({ ...c, thumbUrl: URL.createObjectURL(thumb) });
  }
  return out;
}

export async function addCharacterToLibrary(
  pngBlob: Blob,
  opts: { width: number; height: number; source: Flat2dAvatarSource; cloudUrl?: string }
): Promise<string> {
  const index = ensureLibraryIndex();
  const id = crypto.randomUUID();
  const name = `캐릭터 ${index.characters.length + 1}`;
  await putBlob(charBlobKey(id), pngBlob);
  await putBlob(thumbBlobKey(id), await createThumbnail(pngBlob));
  index.characters.unshift({
    id,
    name,
    width: opts.width,
    height: opts.height,
    source: opts.source,
    cloudUrl: opts.cloudUrl,
    createdAt: new Date().toISOString(),
  });
  index.activeId = id;
  writeIndex(index);
  notifyAvatar2dChanged();
  return id;
}

export async function setActiveLibraryCharacter(id: string | null) {
  const index = ensureLibraryIndex();
  if (id && !index.characters.some((c) => c.id === id)) return;
  index.activeId = id;
  writeIndex(index);
  notifyAvatar2dChanged();
}

export async function loadFlat2dAvatarMeta(): Promise<Flat2dAvatarMeta | null> {
  if (typeof window === "undefined") return null;
  let index = ensureLibraryIndex();
  index = await migrateLegacySingleAvatar(index);
  const activeId = index.activeId;
  if (!activeId) return null;
  const entry = index.characters.find((c) => c.id === activeId);
  if (!entry) return null;
  const blob = await getBlob(charBlobKey(activeId));
  if (!blob) return null;
  return {
    version: 1,
    width: entry.width,
    height: entry.height,
    source: entry.source,
    imageUrl: URL.createObjectURL(blob),
    cloudUrl: entry.cloudUrl,
    registeredAt: entry.createdAt,
  };
}

export function hasFlat2dAvatar(): boolean {
  return hasLibraryCharacters();
}

export async function clearFlat2dAvatar() {
  localStorage.removeItem(LIBRARY_KEY);
  localStorage.removeItem(LEGACY_META_KEY);
  notifyAvatar2dChanged();
}
