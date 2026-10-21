import { decryptAes256Gcm, encryptAes256Gcm, type EncryptedBlob } from "@/lib/encryption";
import { isSelectableCountryCode } from "@/lib/i18n/countries";

export const PAYOUT_DESTINATION_KINDS = ["PAYONEER", "WISE", "BANK"] as const;
export type PayoutDestinationKind = (typeof PAYOUT_DESTINATION_KINDS)[number];

export type PayoutDestination =
  | { kind: "PAYONEER" | "WISE"; email: string; countryCode?: string }
  | {
      kind: "BANK";
      accountHolder: string;
      bankName: string;
      accountNumber: string;
      countryCode: string;
      routingNumber?: string;
    };

const EMAIL_RE = /^[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,255}\.[A-Z]{2,24}$/i;

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "hidden";
  return `${local.slice(0, 1)}***@${domain}`;
}

export function maskAccount(accountNumber: string): string {
  const tail = accountNumber.slice(-4);
  return `····${tail}`;
}

export function payoutCountryCode(destination: PayoutDestination): string | null {
  const code = destination.countryCode?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function parsePayoutDestination(
  input: unknown,
  options?: { requireCountry?: boolean },
): PayoutDestination | null {
  if (!input || typeof input !== "object") return null;
  const requireCountry = options?.requireCountry !== false;
  const raw = input as Record<string, unknown>;
  const kind = raw.kind;
  if (kind === "PAYONEER" || kind === "WISE") {
    const email = clean(raw.email, 254).toLowerCase();
    const countryCode = clean(raw.countryCode, 2).toUpperCase();
    if (!EMAIL_RE.test(email)) return null;
    if (requireCountry) {
      if (!isSelectableCountryCode(countryCode)) return null;
      return { kind, email, countryCode };
    }
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return null;
    return countryCode ? { kind, email, countryCode } : { kind, email };
  }
  if (kind === "BANK") {
    const accountHolder = clean(raw.accountHolder, 80);
    const bankName = clean(raw.bankName, 80);
    const accountNumber = clean(raw.accountNumber, 34).replace(/[^0-9-]/g, "");
    const countryCode = clean(raw.countryCode, 2).toUpperCase();
    const routingNumber = clean(raw.routingNumber, 11).replace(/[^A-Za-z0-9]/g, "").toUpperCase() || undefined;
    if (accountHolder.length < 2 || bankName.length < 2) return null;
    if (!/^[A-Za-z0-9 ,.\-/#']*$/.test(accountHolder) || !/^[A-Za-z0-9 ,.\-/#']*$/.test(bankName)) return null;
    if (/(.)\1{2,}/.test(accountHolder) || /(.)\1{2,}/.test(bankName)) return null;
    if (!/^[0-9-]{4,34}$/.test(accountNumber) || accountNumber.replace(/-/g, "").length < 4) return null;
    if (requireCountry ? !isSelectableCountryCode(countryCode) : !/^[A-Z]{2}$/.test(countryCode)) return null;
    if (routingNumber && !/^[A-Z0-9]{8,11}$/.test(routingNumber)) return null;
    return { kind, accountHolder, bankName, accountNumber, countryCode, routingNumber };
  }
  return null;
}

export function payoutDestinationHint(destination: PayoutDestination): string {
  const country = payoutCountryCode(destination);
  if (destination.kind === "BANK") {
    const place = country ? `${country} · ` : "";
    return `Bank · ${place}${destination.bankName} · ${maskAccount(destination.accountNumber)}`;
  }
  const label = destination.kind === "PAYONEER" ? "Payoneer" : "Wise";
  return country ? `${label} · ${country} · ${maskEmail(destination.email)}` : `${label} · ${maskEmail(destination.email)}`;
}

export function sealPayoutDestination(destination: PayoutDestination): {
  destinationCipher: string;
  destinationKeyId: string;
  destinationHint: string;
} {
  const blob = encryptAes256Gcm(JSON.stringify(destination));
  return {
    destinationCipher: JSON.stringify(blob),
    destinationKeyId: blob.keyId ?? "current",
    destinationHint: payoutDestinationHint(destination),
  };
}

export function openPayoutDestination(destinationCipher: string): PayoutDestination {
  const blob = JSON.parse(destinationCipher) as EncryptedBlob;
  if (!blob || typeof blob.ciphertext !== "string" || typeof blob.iv !== "string" || typeof blob.authTag !== "string") {
    throw new Error("PAYOUT_DESTINATION_CORRUPT");
  }
  const parsed = JSON.parse(decryptAes256Gcm(blob)) as unknown;
  const destination = parsePayoutDestination(parsed, { requireCountry: false });
  if (!destination) throw new Error("PAYOUT_DESTINATION_CORRUPT");
  return destination;
}

const TX_REF_RE = /^[\w.\-:/ ]{1,80}$/;

export function parseTxReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!TX_REF_RE.test(trimmed)) return null;
  return trimmed;
}
