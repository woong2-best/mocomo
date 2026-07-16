/** 확장 가능한 Promotion 지급 조건 — DB 컬럼 추가 없이 JSON rules로 확장 */

export type PromotionRule =
  | { type: "MIN_FOLLOWERS"; value: number }
  | { type: "MAX_FOLLOWERS"; value: number }
  | { type: "CREATOR_APPROVED"; value: boolean }
  | { type: "HAS_LISTING"; value: boolean }
  | { type: "HAS_SALE"; value: boolean }
  | { type: "PREMIUM"; value: boolean }
  | { type: "PARTNER"; value: boolean }
  | { type: "ADMIN_APPROVED"; value: boolean }
  | { type: "SUPPORT_TIER_MIN"; value: string }
  | { type: "ROLE_IN"; value: string[] }
  | { type: "COUNTRY_IN"; value: string[] }
  | { type: "LOCALE_IN"; value: string[] }
  | { type: "MIN_SIGNUP_DAYS"; value: number }
  | { type: "MAX_SIGNUP_DAYS"; value: number }
  | { type: "MIN_TOTAL_SALES_KRW"; value: number }
  | { type: "MIN_TOTAL_TIPS_RECEIVED_KRW"; value: number }
  | { type: "MIN_LIVE_COUNT"; value: number }
  /** 커스텀: 알 수 없는 type은 통과(향후 핸들러 등록용) */
  | { type: string; value: unknown };

export type RuleEvalContext = {
  followerCount: number;
  isCreator: boolean;
  hasListing: boolean;
  hasSale: boolean;
  isPremium: boolean;
  isPartner: boolean;
  adminApproved: boolean;
  supportTierReceived: string;
  role: string;
  countryCode: string | null;
  locale: string | null;
  signupDays: number;
  totalSalesKrw: number;
  totalTipsReceivedKrw: number;
  liveCount: number;
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

type RuleHandler = (rule: PromotionRule, ctx: RuleEvalContext) => string | null;

const HANDLERS: Record<string, RuleHandler> = {
  MIN_FOLLOWERS: (r, ctx) =>
    ctx.followerCount < Number(r.value) ? `followers<${r.value}` : null,
  MAX_FOLLOWERS: (r, ctx) =>
    ctx.followerCount > Number(r.value) ? `followers>${r.value}` : null,
  CREATOR_APPROVED: (r, ctx) => (r.value && !ctx.isCreator ? "not_creator" : null),
  HAS_LISTING: (r, ctx) => (r.value && !ctx.hasListing ? "no_listing" : null),
  HAS_SALE: (r, ctx) => (r.value && !ctx.hasSale ? "no_sale" : null),
  PREMIUM: (r, ctx) => (r.value && !ctx.isPremium ? "not_premium" : null),
  PARTNER: (r, ctx) => (r.value && !ctx.isPartner ? "not_partner" : null),
  ADMIN_APPROVED: (r, ctx) => (r.value && !ctx.adminApproved ? "not_admin_approved" : null),
  SUPPORT_TIER_MIN: (r, ctx) =>
    tierRank(ctx.supportTierReceived) < tierRank(String(r.value))
      ? `tier<${r.value}`
      : null,
  ROLE_IN: (r, ctx) => {
    const list = Array.isArray(r.value) ? r.value.map(String) : [];
    return list.map((v) => v.toUpperCase()).includes(ctx.role.toUpperCase()) ? null : "role";
  },
  COUNTRY_IN: (r, ctx) => {
    const list = Array.isArray(r.value) ? r.value.map((v) => String(v).toUpperCase()) : [];
    const code = (ctx.countryCode || "").toUpperCase();
    return list.length === 0 || list.includes(code) ? null : "country";
  },
  LOCALE_IN: (r, ctx) => {
    const list = Array.isArray(r.value) ? r.value.map((v) => String(v).toLowerCase()) : [];
    const loc = (ctx.locale || "").toLowerCase();
    return list.length === 0 || list.includes(loc) ? null : "locale";
  },
  MIN_SIGNUP_DAYS: (r, ctx) =>
    ctx.signupDays < Number(r.value) ? `signup_days<${r.value}` : null,
  MAX_SIGNUP_DAYS: (r, ctx) =>
    ctx.signupDays > Number(r.value) ? `signup_days>${r.value}` : null,
  MIN_TOTAL_SALES_KRW: (r, ctx) =>
    ctx.totalSalesKrw < Number(r.value) ? `sales<${r.value}` : null,
  MIN_TOTAL_TIPS_RECEIVED_KRW: (r, ctx) =>
    ctx.totalTipsReceivedKrw < Number(r.value) ? `tips<${r.value}` : null,
  MIN_LIVE_COUNT: (r, ctx) =>
    ctx.liveCount < Number(r.value) ? `lives<${r.value}` : null,
};

/** 런타임에 규칙 핸들러 등록 (DB 스키마 변경 없이 확장) */
export function registerRuleHandler(type: string, handler: RuleHandler) {
  HANDLERS[type] = handler;
}

export function evaluatePromotionRules(
  rules: PromotionRule[],
  ctx: RuleEvalContext
): { ok: boolean; failed: string[] } {
  const failed: string[] = [];
  for (const rule of rules) {
    const handler = HANDLERS[rule.type];
    if (!handler) continue; // 미등록 타입은 통과(향후 확장)
    const err = handler(rule, ctx);
    if (err) failed.push(err);
  }
  return { ok: failed.length === 0, failed };
}
