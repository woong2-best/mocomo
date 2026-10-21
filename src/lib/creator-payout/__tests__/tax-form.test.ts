import { describe, expect, it } from "vitest";
import {
  isTaxFormEnglishText,
  isValidForeignTin,
  isW8benEligibleCountry,
  normalizeForeignTin,
  parseTaxFormPayload,
  prepareForeignTinForPdf,
  w8benExpiresAt,
} from "@/lib/creator-payout/tax-form-input";
import { generateTaxFormPdf } from "@/lib/creator-payout/tax-pdf";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("tax form dates and input", () => {
  it("expires a W-8BEN on 31 December three years after the signature year", () => {
    const expires = w8benExpiresAt(new Date("2026-10-19T15:00:00.000Z"));
    expect(expires.toISOString()).toBe("2029-12-31T23:59:59.000Z");
  });

  it("rejects a W-9 without a 9-digit TIN or a signature", () => {
    const signedOn = new Date("2026-10-19T00:00:00.000Z");
    expect(
      parseTaxFormPayload(
        {
          formType: "W9",
          fullName: "Ada Lovelace",
          street: "1 Market Street",
          cityLine: "San Francisco, CA 94105",
          tinKind: "SSN",
          tin: "123",
          signaturePng: ONE_PIXEL_PNG.toString("base64"),
        },
        signedOn,
      ),
    ).toBeNull();
    expect(parseTaxFormPayload({ formType: "W8BEN", fullName: "Kim", street: "Road", cityLine: "Seoul" }, signedOn)).toBeNull();
  });

  it("rejects Hangul and other non-Latin tax form text", () => {
    expect(isTaxFormEnglishText("Gwonung Baek")).toBe(true);
    expect(isTaxFormEnglishText("123, Nakdong-daero")).toBe(true);
    expect(isTaxFormEnglishText("백권웅")).toBe(false);
    expect(isTaxFormEnglishText("Saha-gu 사하구")).toBe(false);
    expect(
      parseTaxFormPayload({
        formType: "W8BEN",
        fullName: "백권웅",
        street: "123 Nakdong-daero",
        city: "Saha-gu",
        state: "Busan",
        postalCode: "49315",
        citizenshipCode: "KR",
        residenceCountryCode: "KR",
        foreignTin: "900101-1234567",
        signaturePng: ONE_PIXEL_PNG.toString("base64"),
      }),
    ).toBeNull();
  });

  it("normalizes foreign TIN and rejects U.S. countries on W-8BEN", () => {
    expect(normalizeForeignTin(" 900101-1234567 ")).toBe("900101-1234567");
    expect(isValidForeignTin("900101-1234567")).toBe(true);
    expect(prepareForeignTinForPdf("900101-1234567")).toBe("9001011234567");
    expect(isW8benEligibleCountry("US")).toBe(false);
    expect(isW8benEligibleCountry("KR")).toBe(true);
  });
});

describe("official tax pdf", () => {
  it("fills the IRS W-8BEN template", async () => {
    const pdf = await generateTaxFormPdf({
      kind: "W8BEN",
      fullName: "Kim Happy",
      citizenshipCode: "KR",
      street: "1 Teheran-ro",
      cityLine: "Seoul 06141",
      residenceCountryCode: "KR",
      foreignTin: "900101-1234567",
      countryCode: "KR",
      signaturePng: ONE_PIXEL_PNG,
      signedOn: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(Buffer.from(pdf.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(20_000);
  });

  it("fills the IRS W-9 template", async () => {
    const pdf = await generateTaxFormPdf({
      kind: "W9",
      fullName: "Ada Lovelace",
      businessName: "",
      street: "1 Market Street",
      cityLine: "San Francisco, CA 94105",
      tinKind: "SSN",
      tin: "123456789",
      countryCode: "US",
      signaturePng: ONE_PIXEL_PNG,
      signedOn: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(Buffer.from(pdf.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
  });
});
