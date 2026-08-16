import { createHash, createHmac, randomBytes } from "crypto";

function parseMasterSecret(): Buffer {
  const raw = process.env.WATERMARK_MASTER_SECRET?.trim();
  if (!raw) {
    throw new Error("WATERMARK_MASTER_SECRET is not configured");
  }
  const b64 = Buffer.from(raw, "base64");
  if (b64.length >= 32) return b64.subarray(0, 32);
  const hex = Buffer.from(raw, "hex");
  if (hex.length >= 32) return hex.subarray(0, 32);
  return createHash("sha256").update(raw, "utf8").digest();
}

export function isWatermarkSecretConfigured(): boolean {
  return Boolean(process.env.WATERMARK_MASTER_SECRET?.trim());
}

export function sha256Prefix(input: string, bytes = 8): Uint8Array {
  return Uint8Array.from(createHash("sha256").update(input, "utf8").digest().subarray(0, bytes));
}

export function deriveOpaqueWatermarkId(input: {
  userId: string;
  contentId: string;
  purchaseId: string;
  sessionNonce: string;
  watermarkVersion: number;
}): string {
  const secret = parseMasterSecret();
  const payload = [
    String(input.watermarkVersion),
    input.userId,
    input.contentId,
    input.purchaseId,
    input.sessionNonce,
  ].join("\0");
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex").slice(0, 32);
}

export function derivePayloadIntegrity(input: {
  version: number;
  contentIdShort: Uint8Array;
  sessionIdShort: Uint8Array;
  nonce: Uint8Array;
  opaqueWatermarkId: string;
}): Uint8Array {
  const secret = parseMasterSecret();
  const h = createHmac("sha256", secret);
  h.update(Buffer.from([input.version]));
  h.update(Buffer.from(input.contentIdShort));
  h.update(Buffer.from(input.sessionIdShort));
  h.update(Buffer.from(input.nonce));
  h.update(input.opaqueWatermarkId, "utf8");
  return Uint8Array.from(h.digest().subarray(0, 4));
}

export function verifyPayloadIntegrity(input: {
  version: number;
  contentIdShort: Uint8Array;
  sessionIdShort: Uint8Array;
  nonce: Uint8Array;
  opaqueWatermarkId: string;
  integrity: Uint8Array;
}): boolean {
  const expected = derivePayloadIntegrity(input);
  if (expected.length !== input.integrity.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ input.integrity[i];
  return diff === 0;
}

export function deriveSpreadSeed(opaqueWatermarkId: string, watermarkVersion: number): Uint8Array {
  return sha256Prefix(`${opaqueWatermarkId}:v${watermarkVersion}:spread`, 32);
}

export function newSessionNonce(): string {
  return randomBytes(16).toString("hex");
}

export function hashFileSha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
