import { quoteMocoTopupLedger } from "@/lib/moco/stripe-pass-through";

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

/** Stripe Checkout USD cents ceiling (~$999,999.99) — not a user-facing cap */
export const MOCO_TOPUP_STRIPE_MAX_USD_CENTS = 99_999_999;

/** @deprecated no user-facing top-up cap */
export const MAX_MOCO_TOPUP_COUNT = Math.floor(MOCO_TOPUP_STRIPE_MAX_USD_CENTS / MOCO_USD_CENTS);

/** Keypad input digit limit (matches Stripe ceiling) */
export const MOCO_TOPUP_INPUT_MAX_DIGITS = String(MAX_MOCO_TOPUP_COUNT).length;

/** @deprecated MIN_MOCO_TOPUP_COUNT */
export const MIN_GEM_TOPUP_USD = MOCO_USD_VALUE;

/** @deprecated */
export const MIN_GEM_TOPUP_GEMS = MIN_MOCO_TOPUP_COUNT;

/** Platform margin on creator payouts (hybrid pass-through 5%) */
export const PLATFORM_MARGIN_RATE = 0.05;

/** Hybrid payout thresholds (USD) */
export const PAYOUT_SKIP_BELOW_USD = 5;
export const PAYOUT_INSTANT_FROM_USD = 33;

export const GEMS_RATE_VERSION = "v3.0_moco5usd_pass5";

export type GiftEventSource =
  | "profile_tip"
  | "live_tip"
  | "live_moco_donation"
  | "post_media_purchase"
  | "letter_donation";

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
  | {
      ok: true;
      moco: number;
      usdCents: number;
      orderName: string;
      basePriceCents: number;
      pgFeeCents: number;
      platformRevenueCents: number;
      creatorAllocationCents: number;
    }
  | { ok: false; error: string };

/** UI 입력 — 숫자만, 정수 단위 */
export function sanitizeMocoTopupInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, MOCO_TOPUP_INPUT_MAX_DIGITS);
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
  const ledger = quoteMocoTopupLedger(moco);
  if (ledger.grossAmountCents > MOCO_TOPUP_STRIPE_MAX_USD_CENTS) {
    return { ok: false, error: "결제 가능한 최대 금액을 초과했습니다." };
  }
  return {
    ok: true,
    moco,
    usdCents: ledger.grossAmountCents,
    orderName: `${moco.toLocaleString()} MOCO 충전`,
    basePriceCents: ledger.basePriceCents,
    pgFeeCents: ledger.pgFeeCents,
    platformRevenueCents: ledger.platformRevenueCents,
    creatorAllocationCents: ledger.creatorAllocationCents,
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

/** Legal copy — MOCO 충전 결제 직전 필수 체크 (Stripe dispute evidence) */
export const MOCO_PURCHASE_TERMS_COPY =
  "[필수] 본 상품은 가상재화(MOCO) 지급 및 '실시간 기여 탑 등록 서비스'가 결합된 패키지 상품입니다. 결제 완료 즉시 사이트 내 기여 탑에 유저 정보가 실시간으로 기록(서비스 공급 완료)되므로, 전자상거래법 제17조 제2항에 의거하여 결제 후에는 유저의 사용 여부와 관계없이 단순 변심으로 인한 환불이 절대 불가능함에 동의합니다.";

/** MOCO 충전 UI — PG 수수료 안내 (체크박스와 분리) */
export const MOCO_PURCHASE_PG_FEE_NOTE =
  "MOCO 충전 시 액면가($5/MOCO)에 더해 Stripe 결제 대행(PG) 실비가 청구될 수 있습니다. 후원 광석 등급은 구매가 아닌 타 사용자에게 후원한 누적 MOCO 기준이며, Reward 정산 등급과는 별개입니다.";

/** @deprecated MOCO_PURCHASE_TERMS_COPY */
export const GEM_PURCHASE_TERMS_COPY = MOCO_PURCHASE_TERMS_COPY;
