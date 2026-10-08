import { describe, expect, it } from "vitest";
import { calcBoostRefund, calcSponsoredAdMoco, SPONSORED_AD_MOCO_PER_DAY } from "@/lib/sponsored-ad/constants";

describe("calcSponsoredAdMoco", () => {
  it("charges 0.5 MOCO per day", () => {
    expect(SPONSORED_AD_MOCO_PER_DAY).toBe(0.5);
    expect(calcSponsoredAdMoco(1)).toBe(0.5);
    expect(calcSponsoredAdMoco(3)).toBe(1.5);
    expect(calcSponsoredAdMoco(7)).toBe(3.5);
    expect(calcSponsoredAdMoco(14)).toBe(7);
  });
});

describe("calcBoostRefund", () => {
  const startsAt = new Date("2026-10-01T00:00:00.000Z");

  it("refunds the full amount when cancelled immediately", () => {
    const quote = calcBoostRefund({
      startsAt,
      days: 3,
      now: startsAt,
      paidMoco: 1.5,
    });
    expect(quote.usedDays).toBe(0);
    expect(quote.unusedDays).toBe(3);
    expect(quote.refundMoco).toBe(1.5);
  });

  it("counts a started day as fully used", () => {
    const quote = calcBoostRefund({
      startsAt,
      days: 3,
      now: new Date("2026-10-01T01:00:00.000Z"),
      paidMoco: 1.5,
    });
    expect(quote.usedDays).toBe(1);
    expect(quote.unusedDays).toBe(2);
    expect(quote.refundMoco).toBe(1);
  });

  it("refunds one unused day after 25 hours of a 3-day boost", () => {
    const quote = calcBoostRefund({
      startsAt,
      days: 3,
      now: new Date("2026-10-02T01:00:00.000Z"),
      paidMoco: 1.5,
    });
    expect(quote.usedDays).toBe(2);
    expect(quote.unusedDays).toBe(1);
    expect(quote.refundMoco).toBe(0.5);
  });

  it("refunds nothing after the purchased period is consumed", () => {
    const quote = calcBoostRefund({
      startsAt,
      days: 1,
      now: new Date("2026-10-02T00:00:01.000Z"),
      paidMoco: 0.5,
    });
    expect(quote.usedDays).toBe(2);
    expect(quote.unusedDays).toBe(0);
    expect(quote.refundMoco).toBe(0);
  });
});
