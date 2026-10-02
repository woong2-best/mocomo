"use client";

import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { DEFAULT_BONDEE_HOME, type BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptGameState } from "@/lib/apt/game/types";
import type { StickerInstance } from "@/lib/diorama/sticker-types";
import type { EconomySnapshot, LocalEconomyCache } from "@/lib/apt/economy/types";
import { createEmptyLocalEconomyCache } from "@/lib/apt/economy/types";
import {
  applyLocalStorageConsume,
  applyLocalStorageReturn,
} from "@/lib/apt/economy/storage-utils";

/** @deprecated userId 스코프 키 사용 — 하위 호환용 */
export const LOCAL_HOME_OWNER = "local-home";

const DB_NAME = "mocomo-local-home";
const DB_VERSION = 1;
const STORE = "kv";

const LS_PREFIX = "mocomo:local-home:";

const LEGACY_KEYS = ["meta", "floorPlan", "bondee", "game", "economy"] as const;

let activeUserId: string | null = null;

/** 로그인 유저별 로컬 집·경제 캐시 분리 */
export function setLocalHomeUserId(userId: string | null) {
  activeUserId = userId;
}

function scopedStorageKey(key: string): string {
  return activeUserId ? `u:${activeUserId}:${key}` : key;
}

type LocalHomeMeta = {
  initialized: boolean;
  version: 1;
};

export type LocalHomeBundle = {
  rooms: AptRoom[];
  bondee: BondeeHomeState;
  game: AptGameState | null;
  meta: LocalHomeMeta;
};

function defaultBundle(): LocalHomeBundle {
  return {
    rooms: createDefaultFloorPlan().rooms.map((r) => ({ ...r })),
    bondee: { ...DEFAULT_BONDEE_HOME, items: [...DEFAULT_BONDEE_HOME.items] },
    game: null,
    meta: { initialized: false, version: 1 },
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function lsDelete(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(`${LS_PREFIX}${key}`);
  } catch {
    /* ignore */
  }
}

async function readRawStorage<T>(storageKey: string): Promise<T | null> {
  try {
    const fromIdb = await idbGet<T>(storageKey);
    if (fromIdb != null) return fromIdb;
  } catch {
    /* fallback */
  }
  return lsGet<T>(storageKey);
}

function lsGet<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

async function storageGet<T>(key: string): Promise<T | null> {
  const sk = scopedStorageKey(key);
  const scoped = await readRawStorage<T>(sk);
  if (scoped != null) return scoped;

  if (!activeUserId) return null;

  const legacy = await readRawStorage<T>(key);
  if (legacy != null) {
    await storageSet(key, legacy);
    return legacy;
  }
  return null;
}

async function storageSet(key: string, value: unknown): Promise<void> {
  const sk = scopedStorageKey(key);
  lsSet(sk, value);
  try {
    await idbSet(sk, value);
  } catch {
    /* localStorage already written */
  }
}

/** 로그아웃·계정 전환 시 해당 유저 로컬 집/경제 캐시 삭제 */
export async function clearLocalHomeData(userId?: string): Promise<void> {
  const uid = userId ?? activeUserId;
  if (!uid) return;

  const deleteKey = async (storageKey: string) => {
    lsDelete(storageKey);
    try {
      await idbDelete(storageKey);
    } catch {
      /* ignore */
    }
  };

  for (const k of LEGACY_KEYS) {
    await deleteKey(`u:${uid}:${k}`);
    await deleteKey(k);
  }

  const userPrefix = `u:${uid}:`;
  if (typeof localStorage !== "undefined") {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (!full?.startsWith(LS_PREFIX)) continue;
      const rel = full.slice(LS_PREFIX.length);
      if (rel.startsWith(userPrefix) || rel.startsWith("diorama:")) {
        toRemove.push(full);
      }
    }
    for (const k of toRemove) localStorage.removeItem(k);
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const k = String(cursor.key);
        if (k.startsWith(userPrefix) || k.startsWith("diorama:")) {
          cursor.delete();
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* idb unavailable */
  }

  if (activeUserId === uid) activeUserId = null;
}

export async function loadLocalHomeMeta(): Promise<LocalHomeMeta> {
  if (typeof window === "undefined") return { initialized: false, version: 1 };
  const meta = await storageGet<LocalHomeMeta>("meta");
  return meta ?? { initialized: false, version: 1 };
}

export async function loadLocalHomeBundle(): Promise<LocalHomeBundle> {
  if (typeof window === "undefined") return defaultBundle();

  const meta = await loadLocalHomeMeta();
  const rooms = await storageGet<AptRoom[]>("floorPlan");
  const bondee = await storageGet<BondeeHomeState>("bondee");
  const game = await storageGet<AptGameState>("game");

  return {
    meta,
    rooms: rooms?.length ? rooms : defaultBundle().rooms,
    bondee: bondee ?? defaultBundle().bondee,
    game: game ?? null,
  };
}

/** 서버에서 받은 초기값은 최초 1회만 로컬 시드 — 이후 서버 무시 */
export async function hydrateLocalHome(seed?: {
  serverRooms?: AptRoom[];
  serverBondee?: BondeeHomeState;
  serverGame?: AptGameState | null;
}): Promise<LocalHomeBundle> {
  const existing = await loadLocalHomeBundle();
  if (existing.meta.initialized) return existing;

  const rooms =
    seed?.serverRooms?.length ? seed.serverRooms.map((r) => ({ ...r })) : defaultBundle().rooms;
  const bondee = seed?.serverBondee
    ? { ...seed.serverBondee, items: [...seed.serverBondee.items] }
    : defaultBundle().bondee;
  const game = seed?.serverGame ?? null;
  const meta: LocalHomeMeta = { initialized: true, version: 1 };

  await Promise.all([
    storageSet("meta", meta),
    storageSet("floorPlan", rooms),
    storageSet("bondee", bondee),
    game ? storageSet("game", game) : Promise.resolve(),
  ]);

  return { rooms, bondee, game, meta };
}

export async function saveLocalFloorPlan(rooms: AptRoom[]): Promise<void> {
  await storageSet("floorPlan", rooms.map((r) => ({ ...r })));
  const meta: LocalHomeMeta = { initialized: true, version: 1 };
  await storageSet("meta", meta);
}

export async function saveLocalBondeeHome(state: BondeeHomeState): Promise<void> {
  const next = { ...state, items: [...state.items] };
  await storageSet("bondee", next);
  const meta: LocalHomeMeta = { initialized: true, version: 1 };
  await storageSet("meta", meta);
}

export async function saveLocalGameState(game: AptGameState): Promise<void> {
  await storageSet("game", game);
}

export async function loadLocalDioramaLayout(roomId: string): Promise<StickerInstance[] | null> {
  const key = `diorama:${roomId}`;
  return storageGet<StickerInstance[]>(key);
}

export async function saveLocalDioramaLayout(
  roomId: string,
  instances: StickerInstance[]
): Promise<void> {
  await storageSet(`diorama:${roomId}`, instances);
  const meta: LocalHomeMeta = { initialized: true, version: 1 };
  await storageSet("meta", meta);
}

export async function clearLocalDioramaLayout(roomId: string): Promise<void> {
  await storageSet(`diorama:${roomId}`, []);
}

export async function saveLocalEconomyCacheToIdb(cache: LocalEconomyCache): Promise<void> {
  await storageSet("economy", cache);
}

export async function loadLocalEconomyCache(): Promise<LocalEconomyCache | null> {
  if (typeof window === "undefined") return null;
  return storageGet<LocalEconomyCache>("economy");
}

export async function saveLocalEconomyCache(cache: LocalEconomyCache): Promise<void> {
  await storageSet("economy", cache);
}

export function economySnapshotToCache(snapshot: EconomySnapshot): LocalEconomyCache {
  return { ...snapshot, pendingStorageConsume: {}, pendingOps: [] };
}

/** 서버 스냅샷 병합 — 오프라인 pending 유지 */
export async function mergeServerEconomySnapshot(
  server: EconomySnapshot
): Promise<LocalEconomyCache> {
  const local = (await loadLocalEconomyCache()) ?? createEmptyLocalEconomyCache();
  const merged: LocalEconomyCache = {
    wallet: server.wallet,
    inventory: server.inventory,
    storage: server.storage,
    syncedAt: server.syncedAt,
    pendingStorageConsume: local.pendingStorageConsume,
    pendingOps: local.pendingOps ?? [],
  };
  await saveLocalEconomyCache(merged);
  return merged;
}

export async function hydrateLocalEconomy(
  serverSnapshot: EconomySnapshot | null
): Promise<LocalEconomyCache> {
  if (!serverSnapshot) {
    return (await loadLocalEconomyCache()) ?? createEmptyLocalEconomyCache();
  }
  return mergeServerEconomySnapshot(serverSnapshot);
}

export async function localConsumeStorage(
  itemId: string,
  online: boolean,
  amount = 1,
  opId?: string
): Promise<{ cache: LocalEconomyCache; opId: string }> {
  const cache = (await loadLocalEconomyCache()) ?? createEmptyLocalEconomyCache();
  const { cache: next, opId: id } = applyLocalStorageConsume(
    cache,
    itemId,
    amount,
    online,
    opId
  );
  await saveLocalEconomyCache(next);
  return { cache: next, opId: id };
}

export async function localReturnStorage(
  itemId: string,
  online: boolean,
  amount = 1,
  opId?: string
): Promise<{ cache: LocalEconomyCache; opId: string }> {
  const cache = (await loadLocalEconomyCache()) ?? createEmptyLocalEconomyCache();
  const { cache: next, opId: id } = applyLocalStorageReturn(
    cache,
    itemId,
    amount,
    online,
    opId
  );
  await saveLocalEconomyCache(next);
  return { cache: next, opId: id };
}

export async function applySyncedEconomySnapshot(
  snapshot: EconomySnapshot
): Promise<LocalEconomyCache> {
  const next = economySnapshotToCache(snapshot);
  await saveLocalEconomyCache(next);
  return next;
}

export async function getPendingStorageOps(): Promise<
  import("@/lib/apt/economy/types").StoragePendingOp[]
> {
  const cache = await loadLocalEconomyCache();
  return cache?.pendingOps ?? [];
}

/** @deprecated getPendingStorageOps 사용 */
export async function getPendingStorageConsume(): Promise<Record<string, number>> {
  const cache = await loadLocalEconomyCache();
  return cache?.pendingStorageConsume ?? {};
}
