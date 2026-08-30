export type EarningCategory = "MARKET_CREATOR" | "LIVE" | "MEMBERSHIP" | "WITHDRAWAL" | "OTHER";

export const EARNING_CATEGORY_LABELS: Record<EarningCategory, string> = {
  MARKET_CREATOR: "MARKET CREATOR",
  LIVE: "LIVE",
  MEMBERSHIP: "MEMBERSHIP",
  WITHDRAWAL: "지출 (출금)",
  OTHER: "기타",
};

const MARKET_CREATOR_TYPES = new Set([
  "marketplace_escrow",
  "marketplace",
  "digital_product",
  "physical_order",
  "emoticon_gift",
  "studio_asset",
  "post_media",
  "message_media",
]);

const LIVE_TYPES = new Set(["tip", "moco_tip", "call_booking"]);

const MEMBERSHIP_TYPES = new Set(["creator_subscription", "creator_episode"]);

export function resolveEarningCategory(
  referenceType: string | null,
  ledgerType: string
): EarningCategory {
  if (ledgerType === "PAYOUT_REQUEST") return "WITHDRAWAL";
  if (!referenceType) return "OTHER";
  if (MARKET_CREATOR_TYPES.has(referenceType)) return "MARKET_CREATOR";
  if (LIVE_TYPES.has(referenceType)) return "LIVE";
  if (MEMBERSHIP_TYPES.has(referenceType)) return "MEMBERSHIP";
  return "OTHER";
}

export const INCOME_CATEGORIES: EarningCategory[] = ["MARKET_CREATOR", "LIVE", "MEMBERSHIP"];
