"use client";

import type { PhotoAvatarRig, PhotoAvatarRenderMode } from "@/lib/photo-avatar/types";

const DB_NAME = "mocomo-photo-avatar";
const DB_VERSION = 1;
const STORE = "images";
const RIG_KEY = "mocomo_photo_avatar_rig_v1";
export const PHOTO_AVATAR_MODE_KEY = "mocomo_avatar_render_mode";
export const PHOTO_AVATAR_CHANGED_EVENT = "mocomo-photo-avatar-changed";

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

export function getPhotoAvatarRenderMode(): PhotoAvatarRenderMode {
  if (typeof window === "undefined") return "vrm";
  const raw = localStorage.getItem(PHOTO_AVATAR_MODE_KEY);
  if (raw === "photo") return "photo";
  if (raw === "flat2d") return "flat2d";
  return "vrm";
}

export function setPhotoAvatarRenderMode(mode: PhotoAvatarRenderMode) {
  localStorage.setItem(PHOTO_AVATAR_MODE_KEY, mode);
  window.dispatchEvent(new Event(PHOTO_AVATAR_CHANGED_EVENT));
}

export function notifyPhotoAvatarChanged() {
  window.dispatchEvent(new Event(PHOTO_AVATAR_CHANGED_EVENT));
}

export async function savePhotoAvatarRig(rig: PhotoAvatarRig, imageBlob: Blob) {
  await putBlob("face", imageBlob);
  const stored: PhotoAvatarRig = { ...rig, imageUrl: "idb://face" };
  localStorage.setItem(RIG_KEY, JSON.stringify(stored));
  setPhotoAvatarRenderMode("photo");
  notifyPhotoAvatarChanged();
}

export async function loadPhotoAvatarRig(): Promise<PhotoAvatarRig | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(RIG_KEY);
  if (!raw) return null;
  try {
    const rig = JSON.parse(raw) as PhotoAvatarRig;
    if (rig.imageUrl.startsWith("idb://")) {
      const blob = await getBlob("face");
      if (!blob) return null;
      rig.imageUrl = URL.createObjectURL(blob);
    }
    return rig;
  } catch {
    return null;
  }
}

export async function clearPhotoAvatarRig() {
  localStorage.removeItem(RIG_KEY);
  setPhotoAvatarRenderMode("vrm");
  notifyPhotoAvatarChanged();
}

export function hasPhotoAvatarRig(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(RIG_KEY);
}
