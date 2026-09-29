import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPRESS_PAYOUT_COUNTRY,
  listExpressPayoutCountryCodes,
  resolveExpressPayoutCountry,
} from "@/lib/marketplace/stripe-supported-countries";

describe("express payout country", () => {
  it("lists only Stripe Express self-serve countries, with US first", () => {
    const codes = listExpressPayoutCountryCodes();
    expect(DEFAULT_EXPRESS_PAYOUT_COUNTRY).toBe("US");
    expect(codes).toHaveLength(40);
    expect(codes[0]).toBe("US");
    expect(codes).toContain("JP");
    expect(codes).toContain("MT");
    for (const blocked of ["KR", "TW", "PH", "IN", "TH", "AE"]) {
      expect(codes).not.toContain(blocked);
    }
  });

  it("accepts a selected Stripe country and rejects a missing or KR default", () => {
    expect(resolveExpressPayoutCountry("us")).toEqual({ country: "US" });
    expect(resolveExpressPayoutCountry("jp")).toEqual({ country: "JP" });
    expect(resolveExpressPayoutCountry(undefined)).toEqual({
      error: "정산받을 계좌의 국가를 선택해 주세요.",
    });
    expect(resolveExpressPayoutCountry("")).toEqual({
      error: "정산받을 계좌의 국가를 선택해 주세요.",
    });
    const kr = resolveExpressPayoutCountry("KR");
    const taiwan = resolveExpressPayoutCountry("TW");
    const unknown = resolveExpressPayoutCountry("ZZ");
    expect("error" in kr ? kr.error : "").toMatch(/KR/);
    expect("error" in taiwan ? taiwan.error : "").toMatch(/지원하지 않는/);
    expect("error" in unknown ? unknown.error : "").toMatch(/지원하지 않는/);
  });
});
