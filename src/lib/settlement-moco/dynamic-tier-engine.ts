import { MOCO_USD_CENTS } from "@/lib/gems/constants";
import { splitMocoFaceValueCents } from "@/lib/moco/stripe-pass-through";
import {
  achievedCreatorRewardTier,
  CREATOR_REWARD_TIER_TABLE,
  type CreatorRewardTierRow,
} from "@/lib/settlement-moco/reward-tier-table";
import {
  MIN_REWARD_PAYOUT_KRW,
  MIN_REWARD_PAYOUT_USD_CENTS,
} from "@/lib/settlement-moco/constants";
import { calcTierRewardAmount, type RewardAmountBreakdown } from "@/lib/settlement-moco/tax";

/** Minimum earned MOCO balance to qualify for any Reward withdrawal (Pulse). */
export const MIN_REWARD_WITHDRAW_MOCO =
  CREATOR_REWARD_TIER_TABLE.find((row) => row.requiredMoco > 0)?.requiredMoco ?? 10;

export type OnDemandWithdrawalQuote = {
  withdrawMoco: number;
  balanceBeforeMoco: number;
  balanceAfterMoco: number;
  activeTierBefore: CreatorRewardTierRow;
  activeTierAfter: CreatorRewardTierRow;
  /** 30-tier row that prices this withdrawal amount */
  payoutTier: CreatorRewardTierRow;
  faceValueCents: number;
  platformMarginCents: number;
  netTransferCents: number;
  /** Creator net USD (matrix) — for batch / reporting */
  netRewardUsd: number;
  transfer: RewardAmountBreakdown;
};

export type OnDemandWithdrawalQuoteError = {
  ok: false;
  code:
    | "INVALID_AMOUNT"
    | "INSUFFICIENT_BALANCE"
    | "BELOW_MIN_TIER"
    | "BELOW_MIN_PAYOUT";
  message: string;
};

export type OnDemandWithdrawalQuoteResult =
  | ({ ok: true } & OnDemandWithdrawalQuote)
  | OnDemandWithdrawalQuoteError;

export function rewardTierIndex(tier: CreatorRewardTierRow): number {
  return CREATOR_REWARD_TIER_TABLE.findIndex((row) => row.label === tier.label);
}

/** True when remaining balance tier is strictly lower than current balance tier. */
export function isRewardTierDowngrade(
  balanceBeforeMoco: number,
  withdrawMoco: number,
): boolean {
  const before = activeRewardTierForBalance(balanceBeforeMoco);
  const after = activeRewardTierAfterWithdrawal(balanceBeforeMoco, withdrawMoco);
  if (!after) return false;
  return rewardTierIndex(after) < rewardTierIndex(before);
}

/**
 * UI copy for tier downgrade warnings (higher rank → lower platform fee %).
 * Actual Stripe transfer amounts use pass-through / matrix cents, not this display rate.
 */
export function uiPlatformFeePercentForTier(tier: CreatorRewardTierRow): number {
  const idx = rewardTierIndex(tier);
  if (idx <= 0) return 5;
  let fee = 5 - idx * 0.125;
  if (idx < 10) fee += 0.275;
  return Math.round(fee * 100) / 100;
}

export function actualPlatformFeePercentFromQuote(faceValueCents: number, platformMarginCents: number): number {
  if (faceValueCents <= 0) return 0;
  return Math.round((platformMarginCents / faceValueCents) * 10000) / 100;
}

/** Active Reward tier from current remaining settlement MOCO (not monthly lock). */
export function activeRewardTierForBalance(balanceMoco: number): CreatorRewardTierRow {
  return achievedCreatorRewardTier(Math.max(0, Math.floor(balanceMoco)));
}

/** Tier after debiting `withdrawMoco` from `balanceBeforeMoco`. */
export function activeRewardTierAfterWithdrawal(
  balanceBeforeMoco: number,
  withdrawMoco: number,
): CreatorRewardTierRow | null {
  const before = Math.max(0, Math.floor(balanceBeforeMoco));
  const w = Math.max(0, Math.floor(withdrawMoco));
  if (w <= 0 || w > before) return null;
  return activeRewardTierForBalance(before - w);
}

/**
 * Net creator USD cents for `withdrawMoco` using the 30-tier matrix marginal rate:
 * tier(withdraw) → (rewardUsd / requiredMoco) × withdraw, integer cents (floor).
 */
export function netUsdCentsFromRewardMatrix(withdrawMoco: number): number {
  const w = Math.max(0, Math.floor(withdrawMoco));
  if (w <= 0) return 0;
  const tier = achievedCreatorRewardTier(w);
  if (tier.requiredMoco <= 0) return 0;
  const tierRewardCents = Math.round(tier.rewardUsd * 100);
  return Math.floor((tierRewardCents * w) / tier.requiredMoco);
}

/** Pass-through split: 500¢ face / MOCO, 5% platform margin before Connect transfer. */
export function passThroughCentsForWithdrawMoco(withdrawMoco: number): {
  faceValueCents: number;
  platformMarginCents: number;
  netTransferCents: number;
} {
  const w = Math.max(0, Math.floor(withdrawMoco));
  const faceValueCents = w * MOCO_USD_CENTS;
  const { platformRevenueCents, creatorAllocationCents } = splitMocoFaceValueCents(faceValueCents);
  return {
    faceValueCents,
    platformMarginCents: platformRevenueCents,
    netTransferCents: creatorAllocationCents,
  };
}

function meetsMinimumTransfer(amount: RewardAmountBreakdown): boolean {
  if (amount.currency === "krw") return amount.netMinor >= MIN_REWARD_PAYOUT_KRW;
  if (amount.currency === "usd") return amount.netMinor >= MIN_REWARD_PAYOUT_USD_CENTS;
  return amount.netMinor >= 100;
}

export function quoteOnDemandWithdrawal(input: {
  balanceBeforeMoco: number;
  withdrawMoco: number;
  countryCode: string;
}): OnDemandWithdrawalQuoteResult {
  const balanceBeforeMoco = Math.max(0, Math.floor(input.balanceBeforeMoco));
  const withdrawMoco = Math.max(0, Math.floor(input.withdrawMoco));

  if (withdrawMoco <= 0) {
    return { ok: false, code: "INVALID_AMOUNT", message: "출금 MOCO 수량을 입력해 주세요." };
  }
  if (withdrawMoco > balanceBeforeMoco) {
    return {
      ok: false,
      code: "INSUFFICIENT_BALANCE",
      message: "정산 MOCO 잔액보다 많이 출금할 수 없습니다.",
    };
  }

  const payoutTier = achievedCreatorRewardTier(withdrawMoco);
  if (payoutTier.requiredMoco <= 0 || payoutTier.rewardUsd <= 0) {
    return {
      ok: false,
      code: "BELOW_MIN_TIER",
      message: `Reward 출금은 최소 ${MIN_REWARD_WITHDRAW_MOCO} MOCO(Pulse) 이상부터 가능합니다.`,
    };
  }

  const matrixNetCents = netUsdCentsFromRewardMatrix(withdrawMoco);
  const passThrough = passThroughCentsForWithdrawMoco(withdrawMoco);
  const netTransferCents = matrixNetCents;
  const netRewardUsd = netTransferCents / 100;

  const transfer = calcTierRewardAmount({
    rewardUsd: netRewardUsd,
    countryCode: input.countryCode,
  });

  if (!meetsMinimumTransfer(transfer) || transfer.netMinor <= 0) {
    return {
      ok: false,
      code: "BELOW_MIN_PAYOUT",
      message: "최소 현금 지급 금액 미달입니다.",
    };
  }

  const activeTierBefore = activeRewardTierForBalance(balanceBeforeMoco);
  const activeTierAfter = activeRewardTierAfterWithdrawal(balanceBeforeMoco, withdrawMoco)!;

  return {
    ok: true,
    withdrawMoco,
    balanceBeforeMoco,
    balanceAfterMoco: balanceBeforeMoco - withdrawMoco,
    activeTierBefore,
    activeTierAfter,
    payoutTier,
    faceValueCents: passThrough.faceValueCents,
    platformMarginCents: passThrough.platformMarginCents,
    netTransferCents,
    netRewardUsd,
    transfer,
  };
}
