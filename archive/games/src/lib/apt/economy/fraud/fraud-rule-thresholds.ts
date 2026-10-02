import type { FraudRuleCode } from "./fraud-types";

export type FraudRuleThresholdMap = Record<FraudRuleCode, Record<string, number>>;

/** DB threshold JSON 기본값 — 감지기 하드코드와 동일 */
export const DEFAULT_RULE_THRESHOLDS: FraudRuleThresholdMap = {
  SELF_MARKET: { minCycles: 2 },
  MULTI_ACCOUNT: { minLinkedAccounts: 5 },
  GOLD_SPIKE: { minTodayGold: 5000, spikeMultiplier: 10, minWithoutAvg: 10000 },
  PRICE_MANIPULATION: { minListings: 3, priceRatio: 50 },
  LIVE_FARM: { minTxCount: 30, minTotalGold: 2000 },
  OFFLINE_SPAM: { minOps: 200 },
  IMPOSSIBLE_PLAY: { windowMinutes: 5, minTxInWindow: 80 },
  MARKET_LOOP: { minSoldCount: 3, maxUniqueBuyers: 2, minReverse: 2 },
  RAPID_LOGIN: { windowMinutes: 15, minTotalActivity: 40 },
  IAP_REPLAY: { minReplays: 1 },
  TOKEN_REUSE: { minHits: 1 },
  CHARGEBACK: { minCount: 1 },
  REFUND_ABUSE: { minShortfallGems: 1 },
};

export const RULE_THRESHOLD_LABELS: Record<
  FraudRuleCode,
  { key: string; label: string; hint?: string }[]
> = {
  SELF_MARKET: [{ key: "minCycles", label: "최소 순환 거래", hint: "회" }],
  MULTI_ACCOUNT: [{ key: "minLinkedAccounts", label: "연결 계정 수", hint: "개 이상" }],
  GOLD_SPIKE: [
    { key: "minTodayGold", label: "최소 일일 골드", hint: "G" },
    { key: "spikeMultiplier", label: "평균 대비 배수", hint: "×" },
    { key: "minWithoutAvg", label: "평균 없을 때 최소", hint: "G" },
  ],
  PRICE_MANIPULATION: [
    { key: "minListings", label: "최소 등록 수", hint: "건" },
    { key: "priceRatio", label: "최대/최소 비율", hint: "×" },
  ],
  LIVE_FARM: [
    { key: "minTxCount", label: "최소 거래 수", hint: "건" },
    { key: "minTotalGold", label: "최소 골드 합", hint: "G" },
  ],
  OFFLINE_SPAM: [{ key: "minOps", label: "최소 offline ops", hint: "건/일" }],
  IMPOSSIBLE_PLAY: [
    { key: "windowMinutes", label: "관찰 창", hint: "분" },
    { key: "minTxInWindow", label: "최소 거래", hint: "건" },
  ],
  MARKET_LOOP: [
    { key: "minSoldCount", label: "최소 판매", hint: "건" },
    { key: "maxUniqueBuyers", label: "최대 구매자 수", hint: "명" },
    { key: "minReverse", label: "역방향 최소", hint: "건" },
  ],
  RAPID_LOGIN: [
    { key: "windowMinutes", label: "관찰 창", hint: "분" },
    { key: "minTotalActivity", label: "최소 활동", hint: "건" },
  ],
  IAP_REPLAY: [{ key: "minReplays", label: "최소 재생", hint: "회" }],
  TOKEN_REUSE: [{ key: "minHits", label: "토큰 재사용", hint: "회" }],
  CHARGEBACK: [{ key: "minCount", label: "차지백", hint: "건" }],
  REFUND_ABUSE: [{ key: "minShortfallGems", label: "회수 부족 젬", hint: "💎" }],
};

export function parseRuleThreshold(
  ruleId: FraudRuleCode,
  raw: unknown
): Record<string, number> {
  const defaults = DEFAULT_RULE_THRESHOLDS[ruleId];
  if (!raw || typeof raw !== "object") return { ...defaults };
  const merged = { ...defaults };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) merged[k] = n;
  }
  return merged;
}

export type FraudRuleConfig = {
  id: FraudRuleCode;
  label: string;
  weight: number;
  enabled: boolean;
  threshold: Record<string, number>;
  description: string | null;
};
