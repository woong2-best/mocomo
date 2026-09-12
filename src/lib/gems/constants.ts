/** 구매 MOCO 1개 = $5 USD (경매·결제와 동일) */
export const MOCO_USD_VALUE = 5;

/** Stripe USD cents per 1 purchased MOCO */
export const MOCO_USD_CENTS = MOCO_USD_VALUE * 100;

/** @deprecated MOCO_USD_VALUE */
export const PRICE_PER_MOCO_USD = MOCO_USD_VALUE;

/** @deprecated PRICE_PER_MOCO_USD */
export const PRICE_PER_GEM_USD = MOCO_USD_VALUE;

/** @deprecated use MOCO_USD_VALUE */
export const MOCO_TO_USD_RATE = MOCO_USD_VALUE;

/** @deprecated MOCO_TO_USD_RATE */
export const GEM_TO_USD_RATE = MOCO_USD_VALUE;

export const MIN_MOCO_TOPUP_COUNT = 1;
export const MAX_MOCO_TOPUP_COUNT = 200;

/** @deprecated MIN_MOCO_TOPUP_COUNT */
export const MIN_GEM_TOPUP_USD = MOCO_USD_VALUE;

/** @deprecated */
export const MIN_GEM_TOPUP_GEMS = MIN_MOCO_TOPUP_COUNT;

/** Platform margin on creator payouts (10%) */
export const PLATFORM_MARGIN_RATE = 0.1;

/** Hybrid payout thresholds (USD) */
export const PAYOUT_SKIP_BELOW_USD = 5;
export const PAYOUT_INSTANT_FROM_USD = 33;

export const GEMS_RATE_VERSION = "v2.0_moco5usd";

export type GiftEventSource = "profile_tip" | "live_tip" | "post_media_purchase";

/** USD 결제 금액(센트) → 필요 MOCO 개수 (올림) */
export function usdCentsToMocoRequired(cents: number): number {
  if (cents <= 0) return 0;
  return Math.ceil(cents / MOCO_USD_CENTS);
}

/** MOCO 개수 → USD 센트 (Stripe) */
export function mocoToUsdCents(moco: number): number {
  return Math.max(0, Math.floor(moco)) * MOCO_USD_CENTS;
}

/** MOCO → USD (표시용) */
export function mocoToUsd(moco: number): number {
  return Math.max(0, Math.floor(moco)) * MOCO_USD_VALUE;
}

/** @deprecated mocoToUsd */
export const gemsToUsd = mocoToUsd;

export function usdToMoco(usd: number): number {
  if (usd <= 0) return 0;
  return Math.ceil(usd / MOCO_USD_VALUE);
}

/** @deprecated usdToMoco */
export const usdToGems = usdToMoco;

export function usdCentsToUsd(cents: number): number {
  return cents / 100;
}

export function usdToStripeCents(usd: number): number {
  return Math.max(0, Math.round(usd * 100));
}

export type GemTopupQuote =
  | { ok: true; moco: number; usdCents: number; orderName: string }
  | { ok: false; error: string };

/** UI 입력 — 숫자만, 정수 단위 */
export function sanitizeMocoTopupInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, String(MAX_MOCO_TOPUP_COUNT).length);
}

/** 정수 MOCO 파싱 (0.5, 1.2 등 소수 거부) */
export function parseMocoTopupCount(raw: string | number): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) return null;
    return raw;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

/** 서버 전용 — 클라이언트 금액·환율 입력 불가 */
export function quoteGemTopup(mocoInput: number): GemTopupQuote {
  if (!Number.isFinite(mocoInput) || !Number.isInteger(mocoInput)) {
    return { ok: false, error: "MOCO는 1 단위 정수로만 충전할 수 있습니다." };
  }
  const moco = mocoInput;
  if (moco < MIN_MOCO_TOPUP_COUNT) {
    return { ok: false, error: `최소 ${MIN_MOCO_TOPUP_COUNT} MOCO부터 충전할 수 있습니다.` };
  }
  if (moco > MAX_MOCO_TOPUP_COUNT) {
    return {
      ok: false,
      error: `1회 충전은 최대 ${MAX_MOCO_TOPUP_COUNT.toLocaleString()} MOCO까지 가능합니다.`,
    };
  }
  return {
    ok: true,
    moco,
    usdCents: mocoToUsdCents(moco),
    orderName: `${moco.toLocaleString()} MOCO 충전`,
  };
}

/** @deprecated quoteGemTopup 사용 */
export function findGemTopupPackage(moco: number) {
  const q = quoteGemTopup(moco);
  if (!q.ok) return null;
  return { gems: q.moco, usdCents: q.usdCents, label: q.orderName };
}

/** @deprecated findGemTopupPackage */
export const findMocoTopupPackage = findGemTopupPackage;

/** @deprecated 패키지 버튼 제거 — quoteGemTopup 사용 */
export const GEM_TOPUP_PACKAGES = [] as const;

/** Legal copy — payment UI footer (구매 MOCO) */
export const MOCO_PURCHASE_TERMS_COPY =
  "결제 시 이용약관에 동의합니다. 구매 MOCO는 환불·인출·환전이 불가합니다. 광석 등급은 구매가 아닌 다른 사용자에게 후원을 완료한 누적 MOCO 기준입니다.";

/** @deprecated MOCO_PURCHASE_TERMS_COPY */
export const GEM_PURCHASE_TERMS_COPY = MOCO_PURCHASE_TERMS_COPY;
