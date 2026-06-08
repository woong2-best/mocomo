const DB_NAME = "mocomo_avatar_v2";
const STORE = "vrm";
const META_KEY = "meta";

export type VrmSlotMeta = {
  id: string;
  name: string;
  updatedAt: number;
};

type VrmSlotRow = VrmSlotMeta & { blob: Blob };

type VrmMeta = {
  activeId: string | null;
  slots: VrmSlotMeta[];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readMeta(db: IDBDatabase): Promise<VrmMeta> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(META_KEY);
    req.onsuccess = () =>
      resolve((req.result as VrmMeta | undefined) ?? { activeId: null, slots: [] });
    req.onerror = () => reject(req.error);
  });
}

async function writeMeta(db: IDBDatabase, meta: VrmMeta) {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(meta, META_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function newId() {
  return `vrm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** VRM 슬롯 저장 (최대 8개) */
export async function saveVrmSlot(file: File, slotId?: string): Promise<string> {
  const db = await openDb();
  const meta = await readMeta(db);
  const id = slotId ?? newId();
  const row: VrmSlotRow = { id, name: file.name, blob: file, updatedAt: Date.now() };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const slots = meta.slots.filter((s) => s.id !== id);
  slots.unshift({ id, name: file.name, updatedAt: row.updatedAt });
  const trimmed = slots.slice(0, 8);
  await writeMeta(db, { activeId: id, slots: trimmed });
  db.close();
  return id;
}

export async function listVrmSlots(): Promise<VrmSlotMeta[]> {
  const db = await openDb();
  const meta = await readMeta(db);
  db.close();
  return meta.slots;
}

export async function loadVrmSlot(id: string): Promise<{ blob: Blob; name: string } | null> {
  const db = await openDb();
  const row = await new Promise<VrmSlotRow | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as VrmSlotRow | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!row) return null;
  return { blob: row.blob, name: row.name };
}

export async function deleteVrmSlot(id: string) {
  const db = await openDb();
  const meta = await readMeta(db);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const slots = meta.slots.filter((s) => s.id !== id);
  const activeId = meta.activeId === id ? (slots[0]?.id ?? null) : meta.activeId;
  await writeMeta(db, { activeId, slots });
  db.close();
}

export async function getActiveVrmSlotId(): Promise<string | null> {
  const db = await openDb();
  const meta = await readMeta(db);
  db.close();
  return meta.activeId;
}

export async function setActiveVrmSlotId(id: string | null) {
  const db = await openDb();
  const meta = await readMeta(db);
  await writeMeta(db, { ...meta, activeId: id });
  db.close();
}

/** 활성 슬롯 또는 null */
export async function loadActiveVrm(): Promise<{ blob: Blob; name: string; id: string } | null> {
  const db = await openDb();
  const meta = await readMeta(db);
  db.close();
  if (!meta.activeId) return null;
  const row = await loadVrmSlot(meta.activeId);
  if (!row) return null;
  return { ...row, id: meta.activeId };
}

export async function clearAllVrmSlots() {
  const db = await openDb();
  const meta = await readMeta(db);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    for (const s of meta.slots) tx.objectStore(STORE).delete(s.id);
    tx.objectStore(STORE).put({ activeId: null, slots: [] }, META_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** @deprecated — saveVrmSlot 사용 */
export async function saveCustomVrm(file: File) {
  await saveVrmSlot(file);
}

export async function loadCustomVrm() {
  const active = await loadActiveVrm();
  if (!active) return null;
  return { blob: active.blob, name: active.name };
}

export async function clearCustomVrm() {
  await clearAllVrmSlots();
}
