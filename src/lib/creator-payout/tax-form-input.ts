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

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function country(value: unknown): string | null {
  const code = clean(value, 2).toUpperCase();
  if (!isSelectableCountryCode(code)) return null;
  return code;
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

export function parseTaxFormPayload(input: unknown, signedOn = new Date()): PreparedTaxForm | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const kind = raw.formType === "W9" || raw.formType === "W8BEN" ? raw.formType : null;
  if (!kind) return null;
  const fullName = clean(raw.fullName, 80);
  const street = clean(raw.street, 100);
  const cityLine = clean(raw.cityLine, 80);
  const signaturePng = signaturePngFromPayload(raw.signaturePng);
  if (fullName.length < 2 || street.length < 3 || cityLine.length < 2 || !signaturePng) return null;

  if (kind === "W9") {
    const tinKind = raw.tinKind === "EIN" ? "EIN" : raw.tinKind === "SSN" ? "SSN" : null;
    const tin = clean(raw.tin, 20).replace(/\D/g, "");
    if (!tinKind || tin.length !== 9) return null;
    return {
      kind,
      fullName,
      businessName: clean(raw.businessName, 80),
      street,
      cityLine,
      tinKind,
      tin,
      countryCode: "US",
      signaturePng,
      signedOn,
    };
  }

  const citizenshipCode = country(raw.citizenshipCode);
  const residenceCountryCode = country(raw.residenceCountryCode);
  const foreignTin = clean(raw.foreignTin, 30);
  if (!citizenshipCode || !residenceCountryCode) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,28}$/.test(foreignTin)) return null;
  return {
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
  };
}
