import { describe, expect, it } from "vitest";
import {
  formatEinInput,
  formatSsnInput,
  hasTaxFormExcessiveRepeat,
  isCompletePayoutEmail,
  listTaxFormSaveIssues,
  payoutEmailsMatch,
  isTaxFormEnglishText,
  isTaxFormTextQualityOk,
  isValidAccountNumber,
  isValidForeignTin,
  isValidSwiftCode,
  isValidTaxPostalCode,
  isW8benEligibleCountry,
  normalizeForeignTin,
  parseTaxFormPayload,
  prepareForeignTinForPdf,
  sanitizeForeignTinInput,
  sanitizeTaxPostalInput,
  sanitizeTaxTextInput,
  composeTaxLegalName,
  inspectTaxLegalNamePart,
  taxFormDraftStarted,
  taxFormSectionStatus,
  TAX_LEGAL_NAME_ERROR,
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
          firstName: "Ada",
          lastName: "Lovelace",
          street: "1 Market Street",
          cityLine: "San Francisco, CA 94105",
          tinKind: "SSN",
          tin: "123",
          signaturePng: ONE_PIXEL_PNG.toString("base64"),
        },
        signedOn,
      ),
    ).toBeNull();
    expect(
      parseTaxFormPayload({ formType: "W8BEN", firstName: "Kim", lastName: "Lee", street: "Road", cityLine: "Seoul" }, signedOn),
    ).toBeNull();
  });

  it("rejects Hangul and other non-Latin tax form text", () => {
    expect(isTaxFormEnglishText("Gwonung Baek")).toBe(true);
    expect(isTaxFormEnglishText("123, Nakdong-daero")).toBe(true);
    expect(isTaxFormEnglishText("백권웅")).toBe(false);
    expect(isTaxFormEnglishText("Saha-gu 사하구")).toBe(false);
    expect(
      parseTaxFormPayload({
        formType: "W8BEN",
        firstName: "백권웅",
        lastName: "Baek",
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
    expect(sanitizeForeignTinInput("abc900-12")).toBe("900-12");
    expect(sanitizeForeignTinInput("９００１０１-１２３４")).toBe("900101-1234");
    expect(isValidForeignTin("ABCD")).toBe(false);
    expect(isValidForeignTin("900101-ABCD")).toBe(true);
    expect(isW8benEligibleCountry("US")).toBe(false);
    expect(isW8benEligibleCountry("KR")).toBe(true);
  });

  it("sanitizes postal codes and rejects letter-only junk", () => {
    expect(sanitizeTaxPostalInput("49315!@#")).toBe("49315");
    expect(sanitizeTaxPostalInput("sw1a 1aa")).toBe("SW1A1AA");
    expect(sanitizeTaxPostalInput("12345678901")).toBe("1234567890");
    expect(sanitizeTaxPostalInput("AAA111")).toBe("AAA111");
    expect(sanitizeTaxPostalInput("１２３４５")).toBe("12345");
    expect(isValidTaxPostalCode("49315")).toBe(true);
    expect(isValidTaxPostalCode("SW1A1AA")).toBe(true);
    expect(isValidTaxPostalCode("abcdef")).toBe(false);
  });

  it("strips Hangul but keeps repeated English letters", () => {
    expect(sanitizeTaxTextInput("백권웅 Gwonung")).toBe(" Gwonung");
    expect(sanitizeTaxTextInput("yyy")).toBe("yyy");
    expect(sanitizeTaxTextInput("hello")).toBe("hello");
    expect(isTaxFormTextQualityOk("eee")).toBe(true);
    expect(hasTaxFormExcessiveRepeat("eee")).toBe(true);
    expect(
      listTaxFormSaveIssues({
        formType: "W9",
        firstName: "Ada",
        lastName: "Lovelace",
        businessName: "fff",
        street: "1 Market Street",
        city: "San Francisco",
        state: "California",
        postalCode: "94105",
        tin: "123456789",
        hasSignature: true,
      }),
    ).toEqual([]);
  });

  it("formats US TINs and payout destination fields", () => {
    expect(formatSsnInput("123456789")).toBe("123-45-6789");
    expect(formatSsnInput("１２３４５６７８９")).toBe("123-45-6789");
    expect(formatSsnInput("12ab34")).toBe("123-4");
    expect(formatEinInput("123456789")).toBe("12-3456789");
    expect(isCompletePayoutEmail("user@wise.com")).toBe(true);
    expect(isCompletePayoutEmail("user@wise")).toBe(false);
    expect(payoutEmailsMatch("User@Wise.com", "user@wise.com")).toBe(true);
    expect(payoutEmailsMatch("user@wise.com", "other@wise.com")).toBe(false);
    expect(isValidAccountNumber("12ab34-56")).toBe(true);
    expect(isValidAccountNumber("abc")).toBe(false);
    expect(isValidSwiftCode("BOFAUS3NXXX")).toBe(true);
    expect(isValidSwiftCode("bo-fa")).toBe(false);
    expect(isValidSwiftCode("")).toBe(true);
  });

  it("keeps section status Not submitted until the form is actually saved", () => {
    const empty = {
      formType: "W8BEN" as const,
      firstName: "",
      lastName: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      citizenshipCode: "KR",
      residenceCountryCode: "KR",
      foreignTin: "",
      hasSignature: false,
    };
    expect(taxFormDraftStarted(empty)).toBe(false);
    expect(taxFormSectionStatus({ issues: listTaxFormSaveIssues(empty), hasDraft: false })).toBe(
      "Not submitted",
    );

    const filled = {
      ...empty,
      firstName: "Kim",
      lastName: "Happy",
      street: "1 Teheran-ro",
      city: "Seoul",
      state: "Seoul",
      postalCode: "06141",
      foreignTin: "900101-1234567",
      hasSignature: true,
    };
    expect(listTaxFormSaveIssues(filled)).toEqual([]);
    expect(taxFormSectionStatus({ issues: [], hasDraft: true })).toBe("Ready to save");
    expect(
      taxFormSectionStatus({
        saved: { formType: "W8BEN", status: "VERIFIED" },
        issues: [],
        hasDraft: true,
      }),
    ).toBe("W-8BEN · Verified");
    expect(
      listTaxFormSaveIssues({ ...filled, hasSignature: false }).some((issue) =>
        issue.includes("signature"),
      ),
    ).toBe(true);
    expect(
      taxFormSectionStatus({
        issues: listTaxFormSaveIssues({ ...filled, hasSignature: false }),
        hasDraft: true,
      }),
    ).toBe("In progress — not saved");
  });

  it("accepts passport-style first, middle, and last names and rejects digits or punctuation", () => {
    expect(inspectTaxLegalNamePart("Jean-Luc", { required: true })).toEqual({ ok: true, value: "Jean-Luc" });
    expect(inspectTaxLegalNamePart("O'Brien", { required: true })).toEqual({ ok: true, value: "O'Brien" });
    expect(inspectTaxLegalNamePart("Mary Ann", { required: true })).toEqual({ ok: true, value: "Mary Ann" });
    expect(inspectTaxLegalNamePart("", { required: false })).toEqual({ ok: true, value: "" });
    expect(inspectTaxLegalNamePart("John,", { required: true }).ok).toBe(false);
    expect(inspectTaxLegalNamePart("J.R", { required: true }).ok).toBe(false);
    expect(inspectTaxLegalNamePart("Ada2", { required: true }).ok).toBe(false);
    expect(inspectTaxLegalNamePart("Aaaa", { required: true }).ok).toBe(false);
    expect(inspectTaxLegalNamePart("A", { required: true }).ok).toBe(false);
    expect(composeTaxLegalName("Ada", "Augusta", "Lovelace")).toBe("Ada Augusta Lovelace");
    expect(composeTaxLegalName("Kim", "", "Happy")).toBe("Kim Happy");
    expect(
      listTaxFormSaveIssues({
        formType: "W9",
        firstName: "John,",
        lastName: "Doe",
        street: "1 Market Street",
        city: "San Francisco",
        state: "California",
        postalCode: "94105",
        tin: "123456789",
        hasSignature: true,
      }).length,
    ).toBeGreaterThan(0);
    expect(TAX_LEGAL_NAME_ERROR).toContain("여권");
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
