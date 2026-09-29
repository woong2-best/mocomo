import { describe, expect, it } from "vitest";
import {
  isMocoSettlementLockDay,
  MOCO_SETTLEMENT_PAY_DAY,
  previousMonthEarnedPeriod,
} from "@/lib/settlement-moco/cycle-period";

describe("moco settlement cycle period", () => {
  it("uses pay day 25", () => {
    expect(MOCO_SETTLEMENT_PAY_DAY).toBe(25);
  });

  it("detects lock day in KST", () => {
    const kst25 = new Date("2026-02-25T12:00:00+09:00");
    expect(isMocoSettlementLockDay(kst25)).toBe(true);
    const kst24 = new Date("2026-02-24T12:00:00+09:00");
    expect(isMocoSettlementLockDay(kst24)).toBe(false);
  });

  it("maps Feb 25 run to January earned period", () => {
    const asOf = new Date("2026-02-25T10:00:00+09:00");
    const period = previousMonthEarnedPeriod(asOf);
    expect(period.periodYear).toBe(2026);
    expect(period.periodMonth).toBe(1);
    expect(period.periodStart.toISOString()).toBe("2025-12-31T15:00:00.000Z");
    expect(period.scheduledPayAt.getTime()).toBe(new Date("2026-02-25T09:00:00+09:00").getTime());
  });
});
