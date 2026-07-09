import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "crypto";

const AES_ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

type KeyEntry = { id: string; key: Buffer };

function parseKeyMaterial(raw: string, label: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${label} is empty`);
  }

  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === KEY_BYTES) return base64;

  const hex = Buffer.from(trimmed, "hex");
  if (hex.length === KEY_BYTES) return hex;

  if (trimmed.length >= KEY_BYTES) {
    return createHash("sha256").update(trimmed, "utf8").digest();
  }

  throw new Error(
    `${label} must be 32 bytes (base64 or hex) or a long passphrase`
  );
}

function loadEncryptionKeys(): KeyEntry[] {
  const keys: KeyEntry[] = [];
  const currentRaw = process.env.OAUTH_ENCRYPTION_KEY;
  if (currentRaw?.trim()) {
    keys.push({
      id: process.env.OAUTH_ENCRYPTION_KEY_ID?.trim() || "current",
      key: parseKeyMaterial(currentRaw, "OAUTH_ENCRYPTION_KEY"),
    });
  }

  const prevRaw = process.env.OAUTH_ENCRYPTION_KEY_PREVIOUS;
  const prevId = process.env.OAUTH_ENCRYPTION_KEY_PREVIOUS_ID?.trim();
  if (prevRaw?.trim() && prevId) {
    keys.push({
      id: prevId,
      key: parseKeyMaterial(prevRaw, "OAUTH_ENCRYPTION_KEY_PREVIOUS"),
    });
  }

  return keys;
}

function getPrimaryEncryptionKey(): KeyEntry {
  const keys = loadEncryptionKeys();
  if (!keys[0]) {
    throw new Error("OAUTH_ENCRYPTION_KEY is not configured");
  }
  return keys[0];
}

function getHmacKey(): Buffer {
  const raw = process.env.OAUTH_HMAC_KEY ?? process.env.OAUTH_ENCRYPTION_KEY;
  if (!raw?.trim()) {
    throw new Error("OAUTH_HMAC_KEY or OAUTH_ENCRYPTION_KEY is not configured");
  }
  return parseKeyMaterial(raw, "OAUTH_HMAC_KEY");
}

export function isOAuthEncryptionConfigured(): boolean {
  return Boolean(process.env.OAUTH_ENCRYPTION_KEY?.trim());
}

export function getActiveEncryptionKeyId(): string {
  return getPrimaryEncryptionKey().id;
}

/** Google sub / email 등 검색용 HMAC-SHA-256 (hex) */
export function hmacSha256Hex(scope: string, value: string): string {
  return createHmac("sha256", getHmacKey())
    .update(`${scope}:${value}`)
    .digest("hex");
}

export function hmacOAuthSub(provider: string, sub: string): string {
  return hmacSha256Hex(`${provider}:sub`, sub);
}

export function hmacOAuthEmail(provider: string, email: string): string {
  return hmacSha256Hex(`${provider}:email`, email.trim().toLowerCase());
}

export function hmacGoogleSub(sub: string): string {
  return hmacOAuthSub("google", sub);
}

export function hmacGoogleEmail(email: string): string {
  return hmacOAuthEmail("google", email);
}

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId?: string;
};

function decryptWithKey(key: Buffer, blob: EncryptedBlob): string {
  const iv = Buffer.from(blob.iv, "base64");
  const authTag = Buffer.from(blob.authTag, "base64");
  const ciphertext = Buffer.from(blob.ciphertext, "base64");
  const decipher = createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}

/** AES-256-GCM — IV·auth tag·keyId 별도 저장 (키 로테이션 지원) */
export function encryptAes256Gcm(plaintext: string): EncryptedBlob {
  const primary = getPrimaryEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(AES_ALGO, primary.key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyId: primary.id,
  };
}

/** keyId가 있으면 해당 키 우선, 실패 시 등록된 모든 키로 시도 */
export function decryptAes256Gcm(blob: EncryptedBlob): string {
  const keys = loadEncryptionKeys();
  if (!keys.length) {
    throw new Error("OAUTH_ENCRYPTION_KEY is not configured");
  }

  const ordered = blob.keyId
    ? [
        ...keys.filter((k) => k.id === blob.keyId),
        ...keys.filter((k) => k.id !== blob.keyId),
      ]
    : keys;

  let lastError: unknown;
  for (const entry of ordered) {
    try {
      return decryptWithKey(entry.key, blob);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Decryption failed");
}
