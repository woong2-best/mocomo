import { describe, expect, it } from "vitest";
import {
  activeRewardTierAfterWithdrawal,
  activeRewardTierForBalance,
  isRewardTierDowngrade,
  netUsdCentsFromRewardMatrix,
  passThroughCentsForWithdrawMoco,
  quoteOnDemandWithdrawal,
  uiPlatformFeePercentForTier,
} from "@/lib/settlement-moco/dynamic-tier-engine";

describe("dynamic tier engine", () => {
  it("binds active tier to remaining settlement balance", () => {
    expect(activeRewardTierForBalance(800).label).toBe("Transcend");
    expect(activeRewardTierForBalance(100).label).toBe("Genesis");
  });

  it("downgrades tier after partial withdrawal (800 − 700 → Genesis)", () => {
    const after = activeRewardTierAfterWithdrawal(800, 700);
    expect(after?.label).toBe("Genesis");
    expect(activeRewardTierForBalance(800).label).toBe("Transcend");
  });

  it("prices withdrawal from matrix tier mapped to withdraw amount", () => {
    expect(netUsdCentsFromRewardMatrix(700)).toBe(332_500);
    expect(netUsdCentsFromRewardMatrix(100)).toBe(47_500);
  });

  it("aligns pass-through cents with matrix (475¢ per MOCO)", () => {
    for (const w of [10, 90, 700, 1000, 15_000]) {
      const matrix = netUsdCentsFromRewardMatrix(w);
      const pass = passThroughCentsForWithdrawMoco(w);
      expect(matrix).toBe(pass.netTransferCents);
      expect(pass.faceValueCents).toBe(w * 500);
      expect(pass.platformMarginCents + pass.netTransferCents).toBe(pass.faceValueCents);
    }
  });

  it("quotes full on-demand withdrawal with tier transition", () => {
    const q = quoteOnDemandWithdrawal({
      balanceBeforeMoco: 800,
      withdrawMoco: 700,
      countryCode: "US",
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.activeTierBefore.label).toBe("Transcend");
    expect(q.activeTierAfter.label).toBe("Genesis");
    expect(q.balanceAfterMoco).toBe(100);
    expect(q.payoutTier.label).toBe("Transcend");
    expect(q.transfer.netMinor).toBe(332_500);
    expect(q.transfer.currency).toBe("usd");
  });

  it("flags tier downgrade and UI fee copy for 800 → withdraw 700", () => {
    expect(isRewardTierDowngrade(800, 700)).toBe(true);
    const before = activeRewardTierForBalance(800);
    const after = activeRewardTierAfterWithdrawal(800, 700);
    expect(before.label).toBe("Transcend");
    expect(after?.label).toBe("Genesis");
    expect(uiPlatformFeePercentForTier(before)).toBe(3.25);
    expect(uiPlatformFeePercentForTier(after!)).toBe(4.4);
  });

  it("rejects Novice-tier withdrawal amounts", () => {
    const q = quoteOnDemandWithdrawal({
      balanceBeforeMoco: 50,
      withdrawMoco: 5,
      countryCode: "US",
    });
    expect(q.ok).toBe(false);
    if (q.ok) return;
    expect(q.code).toBe("BELOW_MIN_TIER");
  });
});
