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
    expect(netUsdCentsFromRewardMatrix(700)).toBe(338_625);
    expect(netUsdCentsFromRewardMatrix(100)).toBe(47_800);
  });

  it("pays the published tier amount at each threshold", () => {
    expect(netUsdCentsFromRewardMatrix(10)).toBe(4_725);
    expect(netUsdCentsFromRewardMatrix(2200)).toBe(1_065_900);
    expect(netUsdCentsFromRewardMatrix(100_000)).toBe(49_500_000);
  });

  it("keeps the 5% face-value pass-through split independent of the tier matrix", () => {
    for (const w of [10, 90, 700, 1000, 15_000]) {
      const pass = passThroughCentsForWithdrawMoco(w);
      expect(pass.faceValueCents).toBe(w * 500);
      expect(pass.netTransferCents).toBe(w * 475);
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
    expect(q.transfer.netMinor).toBe(338_625);
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
