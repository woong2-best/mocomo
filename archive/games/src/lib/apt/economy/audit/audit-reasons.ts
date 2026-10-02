/** enum / action code → 운영자가 읽는 문장 */

const REASON_MAP: Record<string, string> = {
  shop_purchase: "Official Shop Purchase",
  market_list: "Market Listing Created",
  market_cancel: "Market Listing Cancelled",
  market_buy: "Market Purchase",
  market_sell: "Market Sale Proceeds",
  storage_consume: "Storage Item Placed",
  storage_return: "Storage Item Returned",
  flea_npc_buy: "Flea NPC Purchase",
  flea_npc_sell: "Flea NPC Sale",
  cs_admin_refund: "CS Gold Adjustment (Refund)",
  cs_admin_grant_item: "CS Item Grant",
  cs_admin_debit: "CS Gold Debit",
  wallet_credit_live: "Live Cheer Reward",
  wallet_credit_mission: "Daily Mission Reward",
  wallet_credit_admin: "Admin Gold Grant",
  wallet_credit_shop: "Shop Related Credit",
  wallet_credit_market: "Market Related Credit",
  wallet_credit_flea: "Flea Market Credit",
  wallet_credit_purchase: "IAP Gem Purchase",
  wallet_debit_shop: "Shop Purchase",
  wallet_debit_market: "Market Purchase",
  wallet_market: "Market Transaction",
  wallet_shop: "Shop Transaction",
  wallet_live: "Live Reward",
  wallet_mission: "Mission Reward",
  wallet_admin: "Admin Adjustment",
  wallet_flea: "Flea Transaction",
  wallet_purchase: "IAP Purchase",
  iap_purchase: "Google Play Gem Package",
  iap_refund: "IAP Refund",
  fraud_rule_hit: "Fraud Rule Triggered",
  fraud_action_freeze: "Account Frozen (Fraud)",
  fraud_action_unfreeze: "Account Unfrozen",
  fraud_action_warn: "Fraud Warning Issued",
  offline_storage_consume: "Offline Storage Sync (Consume)",
  offline_storage_return: "Offline Storage Sync (Return)",
  market_listing_created: "Market Listing",
  market_sold: "Market Item Sold",
  market_bought: "Market Item Purchased",
  notification_sent: "Economy Notification Sent",
  config_change: "Economy Config Changed",
  feature_flag_change: "Feature Flag Changed",
  MISSION: "Mission Reward",
  SHOP_PURCHASE: "Official Shop Purchase",
  LIVE_REWARD: "Live Cheer Reward",
  MARKET_SOLD: "Market Sale",
  MARKET_PURCHASE: "Market Purchase",
};

export function humanReason(code: string, fallback?: string | null): string {
  if (REASON_MAP[code]) return REASON_MAP[code];
  const lower = code.toLowerCase();
  for (const [k, v] of Object.entries(REASON_MAP)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  if (fallback?.trim()) return fallback.trim();
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
