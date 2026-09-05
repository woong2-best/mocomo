import { describe, expect, it } from "vitest";
import {
  buildCardAuthorizationOptions,
  hasExtendedAuthorizationHold,
  isExtendedAuthEligibleBrand,
  isVisaBrand,
  isVisaExtendedAuthApplied,
  normalizeStripeCardBrand,
  resolveEffectiveHoldExpiresAt,
  shouldRequestExtendedAuthorization,
  shouldSkipReauthorization,
} from "@/lib/marketplace/card-authorization";
import { USED_AUCTION_HOLD_AUTH_DAYS } from "@/lib/used-auction-config";

describe("normalizeStripeCardBrand", () => {
  it("normalizes American Express variants", () => {
    expect(normalizeStripeCardBrand("american express")).toBe("amex");
    expect(normalizeStripeCardBrand("American Express")).toBe("amex");
  });
});

describe("shouldRequestExtendedAuthorization", () => {
  it("requests EA for Mastercard immediately", () => {
    expect(
      shouldRequestExtendedAuthorization({
        cardBrand: "mastercard",
        visaExtendedAuthEnabled: false,
      })
    ).toBe(true);
  });

  it("requests EA for Amex and Discover immediately", () => {
    expect(
      shouldRequestExtendedAuthorization({
        cardBrand: "amex",
        visaExtendedAuthEnabled: false,
      })
    ).toBe(true);
    expect(
      shouldRequestExtendedAuthorization({
        cardBrand: "discover",
        visaExtendedAuthEnabled: false,
      })
    ).toBe(true);
  });

  it("does not request EA for Visa when flag is off", () => {
    expect(
      shouldRequestExtendedAuthorization({
        cardBrand: "visa",
        visaExtendedAuthEnabled: false,
      })
    ).toBe(false);
  });

  it("requests EA for Visa when flag is on", () => {
    expect(
      shouldRequestExtendedAuthorization({
        cardBrand: "visa",
        visaExtendedAuthEnabled: true,
      })
    ).toBe(true);
  });

  it("requests if_available at checkout when brand is unknown", () => {
    expect(
      shouldRequestExtendedAuthorization({
        visaExtendedAuthEnabled: false,
        checkoutBrandUnknown: true,
      })
    ).toBe(true);
  });
});

describe("buildCardAuthorizationOptions", () => {
  it("returns Stripe param for eligible brands", () => {
    expect(
      buildCardAuthorizationOptions({
        cardBrand: "mastercard",
        visaExtendedAuthEnabled: false,
      })
    ).toEqual({ card: { request_extended_authorization: "if_available" } });
  });

  it("returns undefined for Visa with flag off", () => {
    expect(
      buildCardAuthorizationOptions({
        cardBrand: "visa",
        visaExtendedAuthEnabled: false,
      })
    ).toBeUndefined();
  });
});

describe("extended hold detection", () => {
  it("detects extended authorization hold", () => {
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expect(hasExtendedAuthorizationHold(in30Days)).toBe(true);
    expect(shouldSkipReauthorization(in30Days)).toBe(true);
  });

  it("does not treat 7-day hold as extended", () => {
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(hasExtendedAuthorizationHold(in7Days)).toBe(false);
    expect(shouldSkipReauthorization(in7Days)).toBe(false);
  });
});

describe("resolveEffectiveHoldExpiresAt", () => {
  it("caps Visa to 7-day when flag off after checkoutBrandUnknown confirm", () => {
    const authUnix = Math.floor(Date.now() / 1000);
    const extendedCaptureBefore = authUnix + 30 * 24 * 60 * 60;
    const capped = resolveEffectiveHoldExpiresAt({
      cardBrand: "visa",
      visaExtendedAuthEnabled: false,
      captureBeforeUnix: extendedCaptureBefore,
      authorizedAtUnix: authUnix,
    });
    const expectedMs = authUnix * 1000 + USED_AUCTION_HOLD_AUTH_DAYS * 24 * 60 * 60 * 1000;
    expect(capped.getTime()).toBe(expectedMs);
  });

  it("keeps extended window for Mastercard", () => {
    const authUnix = Math.floor(Date.now() / 1000);
    const extendedCaptureBefore = authUnix + 30 * 24 * 60 * 60;
    const expiry = resolveEffectiveHoldExpiresAt({
      cardBrand: "mastercard",
      visaExtendedAuthEnabled: false,
      captureBeforeUnix: extendedCaptureBefore,
      authorizedAtUnix: authUnix,
    });
    expect(expiry.getTime()).toBe(extendedCaptureBefore * 1000);
  });
});

describe("isVisaExtendedAuthApplied", () => {
  it("requires Visa brand, flag, and extended hold window", () => {
    const extended = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
    expect(
      isVisaExtendedAuthApplied({
        cardBrand: "visa",
        visaExtendedAuthEnabled: true,
        holdExpiresAt: extended,
      })
    ).toBe(true);
    expect(
      isVisaExtendedAuthApplied({
        cardBrand: "mastercard",
        visaExtendedAuthEnabled: true,
        holdExpiresAt: extended,
      })
    ).toBe(false);
  });
});

describe("brand helpers", () => {
  it("identifies Visa and extended-eligible brands", () => {
    expect(isVisaBrand("visa")).toBe(true);
    expect(isExtendedAuthEligibleBrand("mastercard")).toBe(true);
    expect(isExtendedAuthEligibleBrand("visa")).toBe(false);
  });
});
