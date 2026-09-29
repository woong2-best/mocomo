import { randomInt, timingSafeEqual } from "crypto";
import { decryptAes256Gcm, encryptAes256Gcm, hmacSha256Hex, isOAuthEncryptionConfigured, type EncryptedBlob } from "@/lib/encryption";

export function generateTradePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function tradePinHmac(tradeId: string, buyerId: string, pin: string): string {
  return hmacSha256Hex("direct-trade-pin", `${tradeId}:${buyerId}:${pin}`);
}

export function tradePinMatches(expectedHex: string, actualHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex, "hex");
    const b = Buffer.from(actualHex, "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function sealTradePin(pin: string): string | null {
  if (!isOAuthEncryptionConfigured()) return null;
  const blob = encryptAes256Gcm(pin);
  return JSON.stringify(blob);
}

export function openTradePin(cipher: string | null): string | null {
  if (!cipher || !isOAuthEncryptionConfigured()) return null;
  try {
    const blob = JSON.parse(cipher) as EncryptedBlob;
    if (!blob?.ciphertext || !blob.iv || !blob.authTag) return null;
    const pin = decryptAes256Gcm(blob);
    return /^\d{6}$/.test(pin) ? pin : null;
  } catch {
    return null;
  }
}
