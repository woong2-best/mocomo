/** 아이템 획득 경로 — 장터·벼룩시장·IAP 등 확장용 */
export type InventoryItemSource =
  | "shop"
  | "market"
  | "flea"
  | "gift"
  | "event"
  | "starter";

export type InventoryItem = {
  itemId: string;
  quantity: number;
  acquiredAt: string;
  source: InventoryItemSource;
};

export type StorageItem = {
  itemId: string;
  quantity: number;
};

export type AptWalletSnapshot = {
  gold: number;
  gems: number;
};

/** 서버 authoritative 경제 스냅샷 */
export type EconomySnapshot = {
  wallet: AptWalletSnapshot;
  inventory: InventoryItem[];
  storage: StorageItem[];
  syncedAt: string;
};

/** 기기 로컬 — 오프라인 배치·동기화 대기 */
export type LocalEconomyCache = EconomySnapshot & {
  /** @deprecated pendingOps 사용 */
  pendingStorageConsume: Record<string, number>;
  /** 오프라인 창고 변경 — opId로 중복 적용 방지 */
  pendingOps?: StoragePendingOp[];
};

export type StoragePendingOp = {
  opId: string;
  itemId: string;
  amount: number;
  kind: "consume" | "return";
};

export function createEmptyEconomySnapshot(now = new Date().toISOString()): EconomySnapshot {
  return {
    wallet: { gold: 0, gems: 0 },
    inventory: [],
    storage: [],
    syncedAt: now,
  };
}

export function createEmptyLocalEconomyCache(now = new Date().toISOString()): LocalEconomyCache {
  return {
    ...createEmptyEconomySnapshot(now),
    pendingStorageConsume: {},
    pendingOps: [],
  };
}
