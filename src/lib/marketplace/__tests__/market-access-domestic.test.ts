import { describe, expect, it } from "vitest";
import {
  assertSameCountryMarketTrade,
  MARKET_DOMESTIC_ONLY_KO,
} from "@/lib/marketplace/market-access";

describe("assertSameCountryMarketTrade", () => {
  it("allows physical when ship country matches seller", () => {
    const res = assertSameCountryMarketTrade({
      sellerCountryCode: "US",
      userCountryCode: "JP",
      shipCountry: "US",
      needsShipping: true,
    });
    expect(res).toEqual({ allowed: true, countryCode: "US" });
  });

  it("blocks physical cross-border ship", () => {
    const res = assertSameCountryMarketTrade({
      sellerCountryCode: "JP",
      userCountryCode: "US",
      shipCountry: "US",
      needsShipping: true,
    });
    expect(res).toEqual({
      allowed: false,
      countryCode: "US",
      message: MARKET_DOMESTIC_ONLY_KO,
      messageEn: expect.any(String),
    });
  });

  it("allows digital when buyer country matches seller", () => {
    const res = assertSameCountryMarketTrade({
      sellerCountryCode: "KR",
      userCountryCode: "KR",
      needsShipping: false,
    });
    expect(res).toEqual({ allowed: true, countryCode: "KR" });
  });

  it("blocks digital cross-border", () => {
    const res = assertSameCountryMarketTrade({
      sellerCountryCode: "JP",
      userCountryCode: "US",
      needsShipping: false,
    });
    expect(res).toMatchObject({ allowed: false, message: MARKET_DOMESTIC_ONLY_KO });
  });
});
