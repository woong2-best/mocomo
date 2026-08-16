import {
  WATERMARK_CODEWORD_BYTES,
  WATERMARK_DATA_BYTES,
  WATERMARK_PARITY_BYTES,
  WATERMARK_PROTOCOL_VERSION,
} from "@/lib/watermark/config";
import {
  deriveOpaqueWatermarkId,
  derivePayloadIntegrity,
  deriveSpreadSeed,
  newSessionNonce,
  sha256Prefix,
  verifyPayloadIntegrity,
} from "@/lib/watermark/crypto/secrets";
import { rsDecode, rsEncode } from "@/lib/watermark/error-correction/reed-solomon";
import type { EncodedWatermarkPayload, WatermarkPayloadCore } from "@/lib/watermark/types";

function packPayload(core: WatermarkPayloadCore): Uint8Array {
  const out = new Uint8Array(WATERMARK_DATA_BYTES);
  out[0] = core.version & 0xff;
  out.set(core.contentIdShort.subarray(0, 8), 1);
  out.set(core.sessionIdShort.subarray(0, 8), 9);
  out.set(core.nonce.subarray(0, 4), 17);
  out.set(core.integrity.subarray(0, 4), 21);
  return out;
}

export function unpackPayload(data: Uint8Array): WatermarkPayloadCore | null {
  if (data.length < WATERMARK_DATA_BYTES) return null;
  return {
    version: data[0],
    contentIdShort: data.subarray(1, 9),
    sessionIdShort: data.subarray(9, 17),
    nonce: data.subarray(17, 21),
    integrity: data.subarray(21, 25),
  };
}

export function buildWatermarkPayload(input: {
  contentId: string;
  sessionId: string;
  userId: string;
  purchaseId: string;
  watermarkVersion: number;
  sessionNonce?: string;
}): {
  core: WatermarkPayloadCore;
  opaqueWatermarkId: string;
  sessionNonce: string;
  codeword: Uint8Array;
  spreadSeed: Uint8Array;
} {
  const sessionNonce = input.sessionNonce ?? newSessionNonce();
  const opaqueWatermarkId = deriveOpaqueWatermarkId({
    userId: input.userId,
    contentId: input.contentId,
    purchaseId: input.purchaseId,
    sessionNonce,
    watermarkVersion: input.watermarkVersion,
  });

  const core: WatermarkPayloadCore = {
    version: input.watermarkVersion,
    contentIdShort: sha256Prefix(input.contentId, 8),
    sessionIdShort: sha256Prefix(input.sessionId, 8),
    nonce: sha256Prefix(`${sessionNonce}:${input.watermarkVersion}`, 4),
    integrity: new Uint8Array(4),
  };

  core.integrity = derivePayloadIntegrity({
    version: core.version,
    contentIdShort: core.contentIdShort,
    sessionIdShort: core.sessionIdShort,
    nonce: core.nonce,
    opaqueWatermarkId,
  });

  const message = packPayload(core);
  const codeword = rsEncode(message, WATERMARK_PARITY_BYTES);
  const spreadSeed = deriveSpreadSeed(opaqueWatermarkId, input.watermarkVersion);

  return { core, opaqueWatermarkId, sessionNonce, codeword, spreadSeed };
}

export function encodeWatermarkPayload(input: {
  contentId: string;
  sessionId: string;
  userId: string;
  purchaseId: string;
  watermarkVersion: number;
  sessionNonce?: string;
}): EncodedWatermarkPayload & { sessionNonce: string } {
  const built = buildWatermarkPayload(input);
  return {
    codeword: built.codeword,
    spreadSeed: built.spreadSeed,
    opaqueWatermarkId: built.opaqueWatermarkId,
    sessionNonce: built.sessionNonce,
  };
}

export function decodeWatermarkCodeword(codeword: Uint8Array): {
  ok: boolean;
  core: WatermarkPayloadCore | null;
  eccValid: boolean;
} {
  if (codeword.length !== WATERMARK_CODEWORD_BYTES) {
    return { ok: false, core: null, eccValid: false };
  }
  const decoded = rsDecode(codeword, WATERMARK_PARITY_BYTES);
  if (!decoded.ok || !decoded.data) {
    return { ok: false, core: null, eccValid: false };
  }
  const core = unpackPayload(decoded.data);
  if (!core || core.version !== WATERMARK_PROTOCOL_VERSION) {
    return { ok: false, core, eccValid: decoded.ok };
  }
  return { ok: true, core, eccValid: true };
}

export function validateDecodedPayload(
  core: WatermarkPayloadCore,
  opaqueWatermarkId: string
): boolean {
  if (core.version !== WATERMARK_PROTOCOL_VERSION) return false;
  return verifyPayloadIntegrity({
    version: core.version,
    contentIdShort: core.contentIdShort,
    sessionIdShort: core.sessionIdShort,
    nonce: core.nonce,
    opaqueWatermarkId,
    integrity: core.integrity,
  });
}

export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}
