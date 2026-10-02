import type { OnDemandWithdrawalQuote } from "@/lib/settlement-moco/dynamic-tier-engine";
import {
  actualPlatformFeePercentFromQuote,
  isRewardTierDowngrade,
  uiPlatformFeePercentForTier,
} from "@/lib/settlement-moco/dynamic-tier-engine";

export function serializeOnDemandQuote(quote: OnDemandWithdrawalQuote) {
  const tierDowngrade = isRewardTierDowngrade(quote.balanceBeforeMoco, quote.withdrawMoco);
  return {
    withdrawMoco: quote.withdrawMoco,
    balanceBeforeMoco: quote.balanceBeforeMoco,
    balanceAfterMoco: quote.balanceAfterMoco,
    activeTierBefore: quote.activeTierBefore.label,
    activeTierAfter: quote.activeTierAfter.label,
    payoutTier: quote.payoutTier.label,
    faceValueCents: quote.faceValueCents,
    platformMarginCents: quote.platformMarginCents,
    netTransferCents: quote.netTransferCents,
    platformFeePercent: actualPlatformFeePercentFromQuote(
      quote.faceValueCents,
      quote.platformMarginCents,
    ),
    activeTierBeforeFeePercent: uiPlatformFeePercentForTier(quote.activeTierBefore),
    activeTierAfterFeePercent: uiPlatformFeePercentForTier(quote.activeTierAfter),
    tierDowngrade,
    transfer: quote.transfer,
  };
}
