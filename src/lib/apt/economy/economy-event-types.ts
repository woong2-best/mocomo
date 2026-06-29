export type EconomyEventCategory =
  | "wallet"
  | "market"
  | "storage"
  | "live"
  | "mission"
  | "fraud"
  | "offline"
  | "admin"
  | "shop"
  | "iap";

export const ECONOMY_EVENT_CATEGORIES: EconomyEventCategory[] = [
  "wallet",
  "market",
  "storage",
  "live",
  "mission",
  "fraud",
  "offline",
  "admin",
  "shop",
  "iap",
];

export const ECONOMY_CATEGORY_LABELS: Record<EconomyEventCategory, string> = {
  wallet: "Wallet",
  market: "Market",
  storage: "Storage",
  live: "Live",
  mission: "Mission",
  fraud: "Fraud",
  offline: "Offline",
  admin: "Admin",
  shop: "Shop",
  iap: "IAP",
};

export type EconomyFraudOverlay = {
  rule: string;
  scoreDelta: number;
  status?: string;
};

/** 앱 전역 경제 이벤트 — CS·Replay·Fraud·통계 공용 */
export type EconomyEvent = {
  id: string;
  at: string;
  category: EconomyEventCategory;
  action: string;
  title: string;
  summary: string;
  deltaGold?: number;
  deltaGems?: number;
  goldBefore?: number;
  goldAfter?: number;
  gemsBefore?: number;
  gemsAfter?: number;
  referenceId?: string | null;
  referenceType?: string | null;
  metadata?: Record<string, unknown>;
  fraudOverlay?: EconomyFraudOverlay;
};

export type EconomyEventStreamOptions = {
  days?: number;
  limit?: number;
  categories?: EconomyEventCategory[];
};
