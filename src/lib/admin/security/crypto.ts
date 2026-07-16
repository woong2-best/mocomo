import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { getAuthSecret } from "@/lib/auth-env";

const AES_ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function requireSecret(): string {
  const secret = getAuthSecret();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is required for admin security crypto");
  }
  return secret;
}

function deriveKey(purpose: string): Buffer {
  return createHmac("sha256", requireSecret()).update(`mocomo-admin:${purpose}`).digest();
}

export function adminEncrypt(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
} {
  const key = deriveKey("aes-v1");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(AES_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyId: "auth-secret-v1",
  };
}

export function adminDecrypt(blob: {
  ciphertext: string;
  iv: string;
  authTag: string;
}): string {
  const key = deriveKey("aes-v1");
  const iv = Buffer.from(blob.iv, "base64");
  const authTag = Buffer.from(blob.authTag, "base64");
  const ciphertext = Buffer.from(blob.ciphertext, "base64");
  const decipher = createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function adminHash(value: string): string {
  return createHmac("sha256", deriveKey("hash-v1")).update(value).digest("hex");
}

export function adminRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function adminSha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function adminTimingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
