"use client";

import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const DB_NAME = "mocomo_avatar_glb_cache";
const STORE = "parts";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadCachedAttachmentGlb(url: string): Promise<THREE.Object3D | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const buffer = await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const get = tx.objectStore(STORE).get(url);
      get.onsuccess = () => resolve((get.result as ArrayBuffer | undefined) ?? null);
      get.onerror = () => reject(get.error);
    });
    db.close();
    if (!buffer) return null;
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(buffer, "");
    return gltf.scene;
  } catch {
    return null;
  }
}

export function cacheAttachmentGlb(url: string, object: THREE.Object3D): void {
  if (typeof indexedDB === "undefined" || typeof window === "undefined") return;
  void (async () => {
    try {
      const exporter = new GLTFExporter();
      const result = await exporter.parseAsync(object.clone(true), { binary: true });
      if (!(result instanceof ArrayBuffer)) return;
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(result, url);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      /* ignore cache failures */
    }
  })();
}
