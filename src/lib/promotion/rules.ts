/** 확장 가능한 Promotion 지급 조건 규칙 */

export type PromotionRule =
  | { type: "MIN_FOLLOWERS"; value: number }
  | { type: "CREATOR_APPROVED"; value: boolean }
  | { type: "HAS_LISTING"; value: boolean }
  | { type: "HAS_SALE"; value: boolean }
  | { type: "PREMIUM"; value: boolean }
  | { type: "SUPPORT_TIER_MIN"; value: string }
  | { type: "ROLE_IN"; value: string[] };

export type RuleEvalContext = {
  followerCount: number;
  isCreator: boolean;
  hasListing: boolean;
  hasSale: boolean;
  isPremium: boolean;
  supportTierReceived: string;
  role: string;
};

const TIER_ORDER = [
  "PEBBLE",
  "STONE",
  "COAL",
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "SAPPHIRE",
  "EMERALD",
  "RUBY",
  "DIAMOND",
  "OBSIDIAN",
  "MYTHIC",
  "LEGEND",
  "CELESTIAL",
  "ETERNAL",
];

function tierRank(tier: string): number {
  const i = TIER_ORDER.indexOf(tier.toUpperCase());
  return i >= 0 ? i : 0;
}

export function parsePromotionRules(raw: unknown): PromotionRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is PromotionRule => !!r && typeof r === "object" && "type" in r);
}

export function evaluatePromotionRules(
  rules: PromotionRule[],
  ctx: RuleEvalContext
): { ok: boolean; failed: string[] } {
  const failed: string[] = [];
  for (const rule of rules) {
    switch (rule.type) {
      case "MIN_FOLLOWERS":
        if (ctx.followerCount < rule.value) failed.push(`followers<${rule.value}`);
        break;
      case "CREATOR_APPROVED":
        if (rule.value && !ctx.isCreator) failed.push("not_creator");
        break;
      case "HAS_LISTING":
        if (rule.value && !ctx.hasListing) failed.push("no_listing");
        break;
      case "HAS_SALE":
        if (rule.value && !ctx.hasSale) failed.push("no_sale");
        break;
      case "PREMIUM":
        if (rule.value && !ctx.isPremium) failed.push("not_premium");
        break;
      case "SUPPORT_TIER_MIN":
        if (tierRank(ctx.supportTierReceived) < tierRank(rule.value)) {
          failed.push(`tier<${rule.value}`);
        }
        break;
      case "ROLE_IN":
        if (!rule.value.map((v) => v.toUpperCase()).includes(ctx.role.toUpperCase())) {
          failed.push("role");
        }
        break;
      default:
        break;
    }
  }
  return { ok: failed.length === 0, failed };
}
