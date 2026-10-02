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

import { APT_GAME_PATH, DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { isAptPublicEnabled } from "@/lib/apt-public-gate";

const APT_HOLD_LINK = DEFAULT_LANDING_PATH;

export const APT_DEEP_LINKS = {
  get market() {
    return isAptPublicEnabled() ? `${APT_GAME_PATH}?shop=market` : APT_HOLD_LINK;
  },
  get flea() {
    return isAptPublicEnabled() ? `${APT_GAME_PATH}?shop=flea` : APT_HOLD_LINK;
  },
  get shop() {
    return isAptPublicEnabled() ? `${APT_GAME_PATH}?shop=official` : APT_HOLD_LINK;
  },
  get inventory() {
    return isAptPublicEnabled() ? APT_GAME_PATH : APT_HOLD_LINK;
  },
  get live() {
    return isAptPublicEnabled() ? APT_GAME_PATH : APT_HOLD_LINK;
  },
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
