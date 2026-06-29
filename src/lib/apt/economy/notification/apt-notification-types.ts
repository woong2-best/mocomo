/** APT 경제 알림 타입 */
export type AptNotificationType =
  | "MARKET_SOLD"
  | "MARKET_PURCHASE"
  | "MARKET_EXPIRED"
  | "MARKET_CANCELLED"
  | "SHOP_PURCHASE"
  | "SHOP_SOLD_OUT"
  | "SHOP_FEATURED_REFRESH"
  | "FLEA_STARTED"
  | "FLEA_ENDING"
  | "FLEA_ITEM_SOLD"
  | "LIVE_REWARD"
  | "LIVE_DAILY_LIMIT"
  | "MISSION_REWARD"
  | "FRAUD_WARN"
  | "FRAUD_WATCH"
  | "FRAUD_FREEZE"
  | "FRAUD_UNFREEZE"
  | "IAP_PURCHASE"
  | "IAP_REFUND"
  | "ADMIN_NOTICE"
  | "SYSTEM";

export const APT_NOTIFICATION_TYPES: AptNotificationType[] = [
  "MARKET_SOLD",
  "MARKET_PURCHASE",
  "MARKET_EXPIRED",
  "MARKET_CANCELLED",
  "SHOP_PURCHASE",
  "SHOP_SOLD_OUT",
  "SHOP_FEATURED_REFRESH",
  "FLEA_STARTED",
  "FLEA_ENDING",
  "FLEA_ITEM_SOLD",
  "LIVE_REWARD",
  "LIVE_DAILY_LIMIT",
  "MISSION_REWARD",
  "FRAUD_WARN",
  "FRAUD_WATCH",
  "FRAUD_FREEZE",
  "FRAUD_UNFREEZE",
  "IAP_PURCHASE",
  "IAP_REFUND",
  "ADMIN_NOTICE",
  "SYSTEM",
];

export type AptNotificationPayload = {
  href?: string;
  listingId?: string;
  itemId?: string;
  gold?: number;
  [key: string]: unknown;
};

import { APT_GAME_PATH } from "@/lib/site-routes";

export const APT_DEEP_LINKS = {
  market: `${APT_GAME_PATH}?shop=market`,
  flea: `${APT_GAME_PATH}?shop=flea`,
  shop: `${APT_GAME_PATH}?shop=official`,
  inventory: APT_GAME_PATH,
  live: APT_GAME_PATH,
  notifications: "/notifications",
} as const;

export function aptNotificationCategory(type: string): string {
  if (type.startsWith("MARKET_")) return "market";
  if (type.startsWith("SHOP_")) return "shop";
  if (type.startsWith("FLEA_")) return "flea";
  if (type.startsWith("LIVE_")) return "live";
  if (type.startsWith("MISSION_")) return "mission";
  if (type.startsWith("FRAUD_")) return "fraud";
  if (type.startsWith("IAP_")) return "iap";
  if (type === "ADMIN_NOTICE" || type === "SYSTEM") return "system";
  return "economy";
}

export const APT_NOTIFICATION_FILTER_LABELS: Record<string, string> = {
  economy: "경제",
  market: "장터",
  shop: "상점",
  flea: "벼룩",
  live: "라이브",
  mission: "미션",
  fraud: "보안",
  iap: "결제",
  system: "공지",
};
