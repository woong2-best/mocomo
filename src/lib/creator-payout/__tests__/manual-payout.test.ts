import { describe, expect, it } from "vitest";
import { maskEmail, parsePayoutDestination, parseTxReference } from "@/lib/creator-payout/destination";
import { inspectTaxFormUpload, isTaxFormKeyOwnedByUser } from "@/lib/creator-payout/tax-storage";

describe("manual payout destination", () => {
  it("accepts a Payoneer email and rejects junk", () => {
    const ok = parsePayoutDestination({ kind: "PAYONEER", email: "Creator@Payoneer.com", countryCode: "US" });
    expect(ok).toEqual({ kind: "PAYONEER", email: "creator@payoneer.com", countryCode: "US" });
    expect(parsePayoutDestination({ kind: "PAYONEER", email: "Creator@Payoneer.com" })).toBeNull();
    expect(parsePayoutDestination({ kind: "PAYONEER", email: "not-an-email", countryCode: "US" })).toBeNull();
    expect(parsePayoutDestination({ kind: "BANK", accountNumber: "12" })).toBeNull();
  });

  it("masks the local part of an email", () => {
    expect(maskEmail("creator@payoneer.com")).toBe("c***@payoneer.com");
  });

  it("accepts a payment reference and rejects newlines", () => {
    expect(parseTxReference(" PO-12345 ")).toBe("PO-12345");
    expect(parseTxReference("bad\nref")).toBeNull();
  });
});

describe("tax form upload", () => {
  it("accepts a PDF by magic bytes and rejects a renamed text file", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n");
    expect(inspectTaxFormUpload(pdf, "application/pdf")).toEqual({ mime: "application/pdf" });
    const fake = Buffer.from("not a pdf but long enough");
    expect("error" in inspectTaxFormUpload(fake, "application/pdf")).toBe(true);
  });

  it("does not treat another creator's object key as owned", () => {
    expect(isTaxFormKeyOwnedByUser("tax-forms/user_a/file.pdf", "user_a")).toBe(true);
    expect(isTaxFormKeyOwnedByUser("tax-forms/user_b/file.pdf", "user_a")).toBe(false);
    expect(isTaxFormKeyOwnedByUser("tax-forms/user_a/../user_b/file.pdf", "user_a")).toBe(false);
  });
});
