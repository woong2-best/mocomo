export type EconomyFeatureKey =
  | "shop"
  | "market"
  | "live"
  | "mission"
  | "notification"
  | "flea"
  | "iap";

export type EconomyFeatureFlags = {
  shopEnabled: boolean;
  marketEnabled: boolean;
  liveEnabled: boolean;
  missionEnabled: boolean;
  notificationEnabled: boolean;
  fleaEnabled: boolean;
  iapEnabled: boolean;
  updatedAt: string;
  updatedByName: string | null;
};

export const ECONOMY_FEATURE_DEFAULTS: Omit<
  EconomyFeatureFlags,
  "updatedAt" | "updatedByName"
> = {
  shopEnabled: true,
  marketEnabled: true,
  liveEnabled: true,
  missionEnabled: true,
  notificationEnabled: true,
  fleaEnabled: true,
  iapEnabled: true,
};

export const FEATURE_FLAG_LABELS: Record<EconomyFeatureKey, string> = {
  shop: "Gold Shop",
  market: "Market (P2P)",
  live: "Live Reward",
  mission: "Mission Reward",
  notification: "Economy Notification",
  flea: "Flea Market",
  iap: "IAP (결제)",
};

export const FEATURE_DISABLED_MESSAGES: Record<EconomyFeatureKey, string> = {
  shop: "상점이 일시적으로 이용 불가합니다.",
  market: "장터가 일시적으로 이용 불가합니다.",
  live: "라이브 보상이 일시적으로 중단되었습니다.",
  mission: "미션 보상이 일시적으로 중단되었습니다.",
  notification: "알림이 일시적으로 중단되었습니다.",
  flea: "벼룩시장이 일시적으로 이용 불가합니다.",
  iap: "결제가 일시적으로 중단되었습니다.",
};

export function flagKeyToField(
  key: EconomyFeatureKey
): keyof Omit<EconomyFeatureFlags, "updatedAt" | "updatedByName"> {
  const map: Record<EconomyFeatureKey, keyof typeof ECONOMY_FEATURE_DEFAULTS> = {
    shop: "shopEnabled",
    market: "marketEnabled",
    live: "liveEnabled",
    mission: "missionEnabled",
    notification: "notificationEnabled",
    flea: "fleaEnabled",
    iap: "iapEnabled",
  };
  return map[key];
}
