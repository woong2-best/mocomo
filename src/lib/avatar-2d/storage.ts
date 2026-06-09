"use client";

import type { Flat2dAvatarMeta } from "@/lib/avatar-2d/types";

const DB_NAME = "mocomo-avatar-2d";
const DB_VERSION = 1;
const STORE = "images";
const META_KEY = "mocomo_avatar_2d_meta_v1";
export const AVATAR_2D_CHANGED_EVENT = "mocomo-avatar-2d-changed";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
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

export function notifyAvatar2dChanged() {
  window.dispatchEvent(new Event(AVATAR_2D_CHANGED_EVENT));
}

export async function saveFlat2dAvatarMeta(meta: Flat2dAvatarMeta, pngBlob: Blob) {
  await putBlob("avatar2d", pngBlob);
  const stored: Flat2dAvatarMeta = { ...meta, imageUrl: "idb://avatar2d" };
  localStorage.setItem(META_KEY, JSON.stringify(stored));
  notifyAvatar2dChanged();
}

export async function loadFlat2dAvatarMeta(): Promise<Flat2dAvatarMeta | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    const meta = JSON.parse(raw) as Flat2dAvatarMeta;
    if (meta.imageUrl.startsWith("idb://")) {
      const blob = await getBlob("avatar2d");
      if (!blob) return null;
      meta.imageUrl = URL.createObjectURL(blob);
    }
    return meta;
  } catch {
    return null;
  }
}

export async function clearFlat2dAvatar() {
  localStorage.removeItem(META_KEY);
  notifyAvatar2dChanged();
}

export function hasFlat2dAvatar(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(META_KEY);
}
