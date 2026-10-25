import { inflateSync } from "zlib";
import { isSelectableCountryCode } from "@/lib/i18n/countries";

export type TaxFormKind = "W9" | "W8BEN";

export type PreparedTaxForm =
  | {
      kind: "W9";
      fullName: string;
      businessName: string;
      street: string;
      cityLine: string;
      tinKind: "SSN" | "EIN";
      tin: string;
      countryCode: "US";
      signaturePng: Buffer;
      signedOn: Date;
    }
  | {
      kind: "W8BEN";
      fullName: string;
      citizenshipCode: string;
      street: string;
      cityLine: string;
      residenceCountryCode: string;
      foreignTin: string;
      countryCode: string;
      signaturePng: Buffer;
      signedOn: Date;
    };

/** IRS PDF Helvetica: Latin letters, digits, space, and basic punctuation. */
const TAX_FORM_LATIN = /^[A-Za-z0-9 ,.\-/#']*$/;

export const TAX_FORM_ENGLISH_ONLY_MESSAGE =
  "All fields must be filled out in English. (영문으로 입력해 주세요)";

export function isTaxFormEnglishText(value: string): boolean {
  return TAX_FORM_LATIN.test(value);
}

/** Collapse 3+ of the same character in a row down to two. */
export function stripTaxFormRepeats(value: string): string {
  return value.replace(/(.)\1{2,}/g, "$1$1");
}

/** Numpad / IME fullwidth digits (０-９) → ASCII 0-9. Never filter by KeyboardEvent.code. */
export function normalizeAsciiDigits(value: string): string {
  return value.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
}

export function sanitizeTaxTextInput(value: string): string {
  return stripTaxFormRepeats(normalizeAsciiDigits(value).replace(/[^a-zA-Z0-9\s,.\-/#']/g, ""));
}

const TAX_POSTAL = /^[A-Za-z0-9-]+$/;

export function sanitizeTaxPostalInput(value: string): string {
  return normalizeAsciiDigits(value).replace(/[^a-zA-Z0-9-]/g, "").toUpperCase().slice(0, 10);
}

export function isValidTaxPostalCode(value: string): boolean {
  const trimmed = sanitizeTaxPostalInput(value);
  if (trimmed.length < 3 || trimmed.length > 10) return false;
  if (!TAX_POSTAL.test(trimmed)) return false;
  return /\d/.test(trimmed);
}

export function sanitizeForeignTinInput(value: string): string {
  return normalizeAsciiDigits(value).replace(/[^0-9-]/g, "").slice(0, 20);
}

export function formatSsnInput(value: string): string {
  const digits = normalizeAsciiDigits(value).replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatEinInput(value: string): string {
  const digits = normalizeAsciiDigits(value).replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function formatUsTinInput(kind: "SSN" | "EIN", value: string): string {
  return kind === "EIN" ? formatEinInput(value) : formatSsnInput(value);
}

export function sanitizeAccountNumberInput(value: string): string {
  return normalizeAsciiDigits(value).replace(/[^0-9-]/g, "").slice(0, 34);
}

export function payoutEmailsMatch(email: string, confirm: string): boolean {
  return email.trim().toLowerCase() === confirm.trim().toLowerCase() && isCompletePayoutEmail(email);
}

export function sanitizeSwiftInput(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 11);
}

export function isCompletePayoutEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidAccountNumber(value: string): boolean {
  const compact = sanitizeAccountNumberInput(value);
  const digits = compact.replace(/-/g, "");
  return digits.length >= 4 && digits.length <= 34 && /^[0-9-]+$/.test(compact);
}

export function isValidSwiftCode(value: string): boolean {
  if (!value.trim()) return true;
  return /^[A-Z0-9]{8,11}$/.test(sanitizeSwiftInput(value));
}

/** Same character repeated 3+ times in a row (e.g. yyy). */
export function hasTaxFormExcessiveRepeat(value: string): boolean {
  return /(.)\1{2,}/.test(value);
}

export function isTaxFormTextQualityOk(value: string): boolean {
  if (!value.trim()) return true;
  return !hasTaxFormExcessiveRepeat(value);
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function cleanLatin(value: unknown, max: number): string | null {
  const next = clean(value, max);
  if (!isTaxFormEnglishText(next)) return null;
  if (!isTaxFormTextQualityOk(next)) return null;
  return next;
}

function cleanPostal(value: unknown): string | null {
  const next = sanitizeTaxPostalInput(clean(value, 10));
  if (!isValidTaxPostalCode(next)) return null;
  return next;
}

export function composeCityLine(raw: Record<string, unknown>): string {
  const city = cleanLatin(raw.city, 50);
  const state = cleanLatin(raw.state, 40);
  const postalCode = cleanPostal(raw.postalCode);
  if (city && state && postalCode && city.length >= 2 && state.length >= 1 && postalCode.length >= 3) {
    return `${city}, ${state} ${postalCode}`;
  }
  return cleanLatin(raw.cityLine, 80) ?? "";
}

function country(value: unknown): string | null {
  const code = clean(value, 2).toUpperCase();
  if (!isSelectableCountryCode(code)) return null;
  return code;
}

/** W-8BEN is for non-U.S. persons only. */
function w8benCountry(value: unknown): string | null {
  const code = country(value);
  if (!code || !isW8benEligibleCountry(code)) return null;
  return code;
}

export function normalizeForeignTin(value: string): string {
  return sanitizeForeignTinInput(clean(value, 20));
}

export function isValidForeignTin(value: string): boolean {
  const compact = normalizeForeignTin(value);
  if (compact.length > 20) return false;
  const core = compact.replace(/-/g, "");
  if (core.length < 4 || core.length > 20) return false;
  return /^[0-9]+$/.test(core);
}

export type TaxFormDraftInput = {
  formType: TaxFormKind;
  fullName: string;
  businessName?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  tin?: string;
  citizenshipCode?: string;
  residenceCountryCode?: string;
  foreignTin?: string;
  hasSignature: boolean;
};

export type TaxReviewStatusLabel = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

/** Client-side reasons the Save tax form button stays off. */
export function listTaxFormSaveIssues(input: TaxFormDraftInput): string[] {
  const issues: string[] = [];
  const textFields = [input.fullName, input.street, input.city, input.state];
  const optional = input.formType === "W9" ? [input.businessName ?? ""] : [];
  const latinFields = [...textFields, ...optional];
  if (input.fullName.trim().length < 2) issues.push("Enter a full legal name in English.");
  if (input.street.trim().length < 3) issues.push("Enter a street address in English.");
  if (input.state.trim().length < 1) issues.push("Select a state or province.");
  if (input.city.trim().length < 2) issues.push("Enter a city.");
  if (!isValidTaxPostalCode(input.postalCode)) {
    issues.push("Enter a postal code that includes a number.");
  }
  if (latinFields.some((value) => !isTaxFormEnglishText(value) || !isTaxFormTextQualityOk(value))) {
    issues.push("Use English letters only. Do not repeat the same character 3+ times.");
  }
  if (input.formType === "W9") {
    if ((input.tin ?? "").replace(/\D/g, "").length !== 9) {
      issues.push("Enter a 9-digit SSN or EIN.");
    }
  } else {
    const citizenship = (input.citizenshipCode ?? "").toUpperCase();
    const residence = (input.residenceCountryCode ?? "").toUpperCase();
    if (citizenship === "US" || residence === "US" || citizenship.length !== 2 || residence.length !== 2) {
      issues.push("W-8BEN needs a non-U.S. country of citizenship and residence.");
    }
    if (!isValidForeignTin(input.foreignTin ?? "")) {
      issues.push("Enter a foreign TIN using at least 4 digits.");
    }
  }
  if (!input.hasSignature) issues.push("Draw a signature, then click Save tax form.");
  return issues;
}

export function taxFormDraftStarted(input: TaxFormDraftInput): boolean {
  return Boolean(
    input.fullName.trim() ||
      input.businessName?.trim() ||
      input.street.trim() ||
      input.city.trim() ||
      input.state.trim() ||
      input.postalCode.trim() ||
      input.tin?.trim() ||
      input.foreignTin?.trim() ||
      input.hasSignature,
  );
}

export function taxReviewStatusLabel(status: TaxReviewStatusLabel | null | undefined): string {
  if (status === "VERIFIED") return "Verified";
  if (status === "PENDING") return "Pending review";
  if (status === "REJECTED") return "Rejected";
  if (status === "EXPIRED") return "Expired";
  return "Not submitted";
}

/** Section status: filling the form is not the same as saving it. */
export function taxFormSectionStatus(input: {
  loading?: boolean;
  saved?: { formType: TaxFormKind; status: TaxReviewStatusLabel } | null;
  issues: string[];
  hasDraft: boolean;
}): string {
  if (input.loading) return "…";
  if (input.saved) {
    const form = input.saved.formType === "W9" ? "W-9" : "W-8BEN";
    return `${form} · ${taxReviewStatusLabel(input.saved.status)}`;
  }
  if (input.issues.length === 0) return "Ready to save";
  if (input.hasDraft) return "In progress — not saved";
  return "Not submitted";
}

export function prepareForeignTinForPdf(value: unknown): string | null {
  const compact = normalizeForeignTin(typeof value === "string" ? value : "");
  if (!isValidForeignTin(compact)) return null;
  return compact.replace(/-/g, "");
}

export function isW8benEligibleCountry(code: string): boolean {
  const upper = code.trim().toUpperCase();
  return isSelectableCountryCode(upper) && upper !== "US";
}

export function w8benExpiresAt(signedOn: Date): Date {
  return new Date(Date.UTC(signedOn.getUTCFullYear() + 3, 11, 31, 23, 59, 59));
}

export function signaturePngFromPayload(value: unknown): Buffer | null {
  if (typeof value !== "string") return null;
  const base64 = value.replace(/^data:image\/png;base64,/i, "").replace(/\s/g, "");
  if (base64.length < 200 || base64.length > 600_000) return null;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return null;
  }
  if (buffer.length < 800 || buffer.length > 450_000) return null;
  if (buffer[0] !== 0x89 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  if (!signatureHasInk(buffer)) return null;
  return buffer;
}

function signatureHasInk(png: Buffer): boolean {
  if (png.length < 33 || png.toString("ascii", 12, 16) !== "IHDR") return false;
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const colorType = png[25];
  if (width < 120 || height < 40 || width > 2000 || height > 800) return false;
  if (width * height > 1_600_000) return false;

  const chunks: Buffer[] = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const len = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (offset + 12 + len > png.length) return false;
    if (type === "IDAT") chunks.push(png.subarray(offset + 8, offset + 8 + len));
    if (type === "IEND") break;
    offset += 12 + len;
  }
  if (chunks.length === 0) return false;

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(chunks), { maxOutputLength: 8_000_000 });
  } catch {
    return false;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (channels === 0) return png.length > 4_000;
  const stride = width * channels;
  let ink = 0;
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1) + 1;
    if (row + stride > raw.length) break;
    for (let x = 0; x < width; x += 3) {
      const i = row + x * channels;
      const alpha = channels === 4 ? raw[i + 3]! : 255;
      const red = raw[i] ?? 255;
      if (alpha > 20 && red < 230) {
        ink++;
        if (ink >= 24) return true;
      }
    }
  }
  return false;
}

export function inspectTaxFormPayload(
  input: unknown,
  signedOn = new Date(),
): { ok: true; value: PreparedTaxForm } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Complete every required field and sign the form." };
  }
  const raw = input as Record<string, unknown>;
  const kind = raw.formType === "W9" || raw.formType === "W8BEN" ? raw.formType : null;
  if (!kind) return { ok: false, error: "Choose W-9 or W-8BEN." };
  const fullName = cleanLatin(raw.fullName, 80);
  const street = cleanLatin(raw.street, 100);
  const cityLine = composeCityLine(raw);
  const signaturePng = signaturePngFromPayload(raw.signaturePng);
  if (!fullName || fullName.length < 2) {
    return { ok: false, error: "Enter a full legal name in English." };
  }
  if (!street || street.length < 3) {
    return { ok: false, error: "Enter a street address in English." };
  }
  if (!cityLine || cityLine.length < 2) {
    return { ok: false, error: "Enter city, state, and a valid postal code." };
  }
  if (!signaturePng) {
    return { ok: false, error: "Draw a clearer signature, then save again." };
  }

  if (kind === "W9") {
    const tinKind = raw.tinKind === "EIN" ? "EIN" : raw.tinKind === "SSN" ? "SSN" : null;
    const tin = clean(raw.tin, 20).replace(/\D/g, "");
    const businessName = cleanLatin(raw.businessName, 80);
    if (businessName === null) {
      return { ok: false, error: "Enter the business name in English, or leave it blank." };
    }
    if (!tinKind || tin.length !== 9) {
      return { ok: false, error: "Enter a 9-digit SSN or EIN." };
    }
    return {
      ok: true,
      value: {
        kind,
        fullName,
        businessName,
        street,
        cityLine,
        tinKind,
        tin,
        countryCode: "US",
        signaturePng,
        signedOn,
      },
    };
  }

  const citizenshipCode = w8benCountry(raw.citizenshipCode);
  const residenceCountryCode = w8benCountry(raw.residenceCountryCode);
  const foreignTin = prepareForeignTinForPdf(raw.foreignTin);
  if (!citizenshipCode || !residenceCountryCode) {
    return { ok: false, error: "Choose a non-U.S. country of citizenship and residence." };
  }
  if (!foreignTin) {
    return { ok: false, error: "Enter a foreign TIN using digits and hyphens only." };
  }
  return {
    ok: true,
    value: {
      kind,
      fullName,
      citizenshipCode,
      street,
      cityLine,
      residenceCountryCode,
      foreignTin,
      countryCode: residenceCountryCode,
      signaturePng,
      signedOn,
    },
  };
}

export function parseTaxFormPayload(input: unknown, signedOn = new Date()): PreparedTaxForm | null {
  const inspected = inspectTaxFormPayload(input, signedOn);
  return inspected.ok ? inspected.value : null;
}
