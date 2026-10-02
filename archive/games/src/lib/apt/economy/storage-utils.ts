import { isStarterOwned } from "@/lib/apt/game/shop";
import type { LocalEconomyCache, StorageItem, StoragePendingOp } from "./types";

export function newStorageOpId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pendingDeltaForItem(cache: LocalEconomyCache, itemId: string): number {
  let delta = 0;
  for (const op of cache.pendingOps ?? []) {
    if (op.itemId !== itemId) continue;
    delta += op.kind === "return" ? op.amount : -op.amount;
  }
  const legacy = cache.pendingStorageConsume[itemId] ?? 0;
  return delta - legacy;
}

export function getStorageQuantity(storage: StorageItem[], itemId: string): number {
  return storage.find((s) => s.itemId === itemId)?.quantity ?? 0;
}

/** 창고 + 오프라인 pending 반영한 배치 가능 수량 */
export function getEffectiveStorageQuantity(cache: LocalEconomyCache, itemId: string): number {
  if (isStarterOwned(itemId)) return Number.MAX_SAFE_INTEGER;
  const base = getStorageQuantity(cache.storage, itemId);
  return Math.max(0, base + pendingDeltaForItem(cache, itemId));
}

export function canPlaceFromStorage(cache: LocalEconomyCache | null, itemId: string): boolean {
  if (isStarterOwned(itemId)) return true;
  if (!cache) return false;
  return getEffectiveStorageQuantity(cache, itemId) > 0;
}

export function canPlaceFromStorageList(storage: StorageItem[], itemId: string): boolean {
  if (isStarterOwned(itemId)) return true;
  return getStorageQuantity(storage, itemId) > 0;
}

export function shouldConsumeStorage(itemId: string): boolean {
  return !isStarterOwned(itemId);
}

export function applyLocalStorageConsume(
  cache: LocalEconomyCache,
  itemId: string,
  amount = 1,
  online = false,
  opId?: string
): { cache: LocalEconomyCache; opId: string } {
  const id = opId ?? newStorageOpId();
  if (!shouldConsumeStorage(itemId) || amount <= 0) {
    return { cache, opId: id };
  }

  if (online) {
    const existing = cache.storage.find((s) => s.itemId === itemId);
    const storage = existing
      ? cache.storage.map((s) =>
          s.itemId === itemId ? { ...s, quantity: Math.max(0, s.quantity - amount) } : s
        )
      : [...cache.storage, { itemId, quantity: 0 }];
    return { cache: { ...cache, storage }, opId: id };
  }

  const op: StoragePendingOp = { opId: id, itemId, amount, kind: "consume" };
  const pendingOps = [...(cache.pendingOps ?? []), op];
  const pending = { ...cache.pendingStorageConsume };
  pending[itemId] = (pending[itemId] ?? 0) + amount;
  return {
    cache: { ...cache, pendingOps, pendingStorageConsume: pending },
    opId: id,
  };
}

export function applyLocalStorageReturn(
  cache: LocalEconomyCache,
  itemId: string,
  amount = 1,
  online = false,
  opId?: string
): { cache: LocalEconomyCache; opId: string } {
  const id = opId ?? newStorageOpId();
  if (!shouldConsumeStorage(itemId) || amount <= 0) {
    return { cache, opId: id };
  }

  if (online) {
    const existing = cache.storage.find((s) => s.itemId === itemId);
    const storage = existing
      ? cache.storage.map((s) =>
          s.itemId === itemId ? { ...s, quantity: s.quantity + amount } : s
        )
      : [...cache.storage, { itemId, quantity: amount }];
    return { cache: { ...cache, storage }, opId: id };
  }

  const op: StoragePendingOp = { opId: id, itemId, amount, kind: "return" };
  const pendingOps = [...(cache.pendingOps ?? []), op];
  const pending = { ...cache.pendingStorageConsume };
  const next = (pending[itemId] ?? 0) - amount;
  if (next <= 0) delete pending[itemId];
  else pending[itemId] = next;
  return {
    cache: { ...cache, pendingOps, pendingStorageConsume: pending },
    opId: id,
  };
}

export function clearPendingStorage(cache: LocalEconomyCache): LocalEconomyCache {
  return { ...cache, pendingStorageConsume: {}, pendingOps: [] };
}

/** @deprecated clearPendingStorage 사용 */
export function clearPendingStorageConsume(cache: LocalEconomyCache): LocalEconomyCache {
  return clearPendingStorage(cache);
}
