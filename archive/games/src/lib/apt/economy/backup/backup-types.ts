/** 스냅샷 생성 유형 */
export type SnapshotType =
  | "manual"
  | "scheduled"
  | "before_restore"
  | "before_publish"
  | "before_migration";

/** 부분 복구 범위 */
export type RestoreScope =
  | "wallet"
  | "inventory"
  | "storage"
  | "listings"
  | "config"
  | "featureFlags"
  | "fraudRules"
  | "goldShop"
  | "flea";

export const RESTORE_SCOPE_LABELS: Record<RestoreScope, string> = {
  wallet: "Wallet",
  inventory: "Inventory",
  storage: "Storage",
  listings: "Listing",
  config: "Config",
  featureFlags: "Feature Flag",
  fraudRules: "Fraud Rule",
  goldShop: "Shop",
  flea: "Flea",
};

export const ALL_RESTORE_SCOPES: RestoreScope[] = [
  "wallet",
  "inventory",
  "storage",
  "listings",
  "config",
  "featureFlags",
  "fraudRules",
  "goldShop",
  "flea",
];

export type SnapshotStats = {
  walletCount: number;
  inventoryCount: number;
  storageCount: number;
  listingCount: number;
  goldSupply: number;
  gemSupply: number;
  userCount: number;
  goldShopOfferCount: number;
  fleaEventCount: number;
  npcOfferCount: number;
  fraudRuleCount: number;
  capturedAt: string;
};

export type SnapshotWalletRow = {
  userId: string;
  gold: number;
  gems: number;
  legacyMigrated: boolean;
};

export type SnapshotInventoryRow = {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  source: string;
  acquiredAt: string;
};

export type SnapshotStorageRow = {
  userId: string;
  itemId: string;
  quantity: number;
};

export type SnapshotListingRow = {
  id: string;
  sellerId: string;
  buyerId: string | null;
  itemId: string;
  itemKind: string;
  stickerTypeId: string | null;
  roomId: string | null;
  itemData: unknown;
  source: string;
  status: string;
  priceGold: number;
  priceKrw: number;
  fleaEventId: string | null;
  hiddenByAdmin: boolean;
  suspiciousFlag: boolean;
  viewCount: number;
  expiresAt: string | null;
  createdAt: string;
  soldAt: string | null;
};

export type SnapshotFraudRuleRow = {
  id: string;
  label: string;
  weight: number;
  enabled: boolean;
  threshold: unknown;
  description: string | null;
};

export type SnapshotGoldShopRow = {
  id: string;
  itemId: string;
  goldPrice: number;
  originalGoldPrice: number | null;
  featured: boolean;
  isNew: boolean;
  limitedStock: number | null;
  soldCount: number;
  startsAt: string | null;
  endsAt: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type SnapshotFleaEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  notice: string | null;
  bannerUrl: string | null;
  startsAt: string;
  endsAt: string;
  feeRate: number;
  active: boolean;
  published: boolean;
  visitCount: number;
};

export type SnapshotFleaNpcRow = {
  id: string;
  eventId: string;
  kind: string;
  stickerTypeId: string;
  goldPrice: number;
  discountPercent: number | null;
  stock: number | null;
  soldCount: number;
  boughtCount: number;
  enabled: boolean;
  sortOrder: number;
};

export type EconomySnapshotPayload = {
  version: 1;
  wallets: SnapshotWalletRow[];
  inventory: SnapshotInventoryRow[];
  storage: SnapshotStorageRow[];
  listings: SnapshotListingRow[];
  economyConfig: Record<string, unknown> | null;
  featureFlags: Record<string, unknown> | null;
  fraudRules: SnapshotFraudRuleRow[];
  fraudRuleMeta: Record<string, unknown> | null;
  goldShop: SnapshotGoldShopRow[];
  fleaEvents: SnapshotFleaEventRow[];
  fleaNpcOffers: SnapshotFleaNpcRow[];
};

export type SnapshotDiffMetric = {
  key: string;
  label: string;
  snapshot: number;
  current: number;
  difference: number;
};

export type SnapshotDiff = {
  metrics: SnapshotDiffMetric[];
  corrupted: boolean;
  checksumOk: boolean;
};

export type RestorePlan = {
  scopes: RestoreScope[];
  walletUsers: number;
  inventoryRows: number;
  storageRows: number;
  listingRows: number;
  goldShopRows: number;
  fleaEventRows: number;
  npcOfferRows: number;
  fraudRuleRows: number;
  configChanged: boolean;
  featureFlagsChanged: boolean;
  goldDelta: number;
  gemDelta: number;
  warnings: string[];
};

export type SnapshotListItem = {
  id: string;
  label: string;
  type: SnapshotType;
  stats: SnapshotStats;
  checksum: string;
  createdAt: string;
  createdByName: string | null;
};

export type RestoreLogDto = {
  id: string;
  snapshotId: string;
  snapshotLabel: string;
  correlationId: string;
  scopes: RestoreScope[];
  dryRun: boolean;
  reason: string;
  stats: Record<string, unknown>;
  adminName: string;
  createdAt: string;
};
