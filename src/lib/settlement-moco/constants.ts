import { MOCO_KRW_PER_UNIT } from "@/lib/moco/economy";

/** 1 정산 MOCO = 10 KRW (구매 MOCO와 동일 단위) */
export const SETTLEMENT_MOCO_KRW_PER_UNIT = MOCO_KRW_PER_UNIT;

/** USD → KRW 환산 (정산 MOCO 적립용) */
export const SETTLEMENT_FX_KRW_PER_USD = Number(process.env.SETTLEMENT_FX_KRW_PER_USD ?? 1350);

/** 플랫폼 수수료율 — src/lib/settlement.ts PLATFORM_FEE_RATE 와 동기화 */
export const PLATFORM_FEE_RATE = 0.1;

/** 크리에이터 Reward 지급률 — 플랫폼 수수료 차감 후 */
export const SETTLEMENT_REWARD_RATE = 1 - PLATFORM_FEE_RATE;

/** 한국 원천징수세 (소득세 3% + 지방세 0.3%) */
export const KR_WITHHOLDING_RATE = 0.033;

/** 월말 Reward 최소 지급 (KRW 원) */
export const MIN_REWARD_PAYOUT_KRW = Number(process.env.MIN_REWARD_PAYOUT_KRW ?? 10_000);

/** 월말 Reward 최소 지급 (USD cents) */
export const MIN_REWARD_PAYOUT_USD_CENTS = Number(process.env.MIN_REWARD_PAYOUT_USD_CENTS ?? 1_000);

export type TaxFormType = "W8BEN" | "W9";

export const REWARD_TERMS_LABEL = "크리에이터 활동 성과 보수(Reward)";
