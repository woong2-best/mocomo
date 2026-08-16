/**
 * Reed-Solomon over GF(256) — ZXing implementation via `reedsolomon` package.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RS = require("reedsolomon") as {
  GenericGF: {
    DATA_MATRIX_FIELD_256: () => GenericField;
  };
  ReedSolomonEncoder: new (field: GenericField) => {
    encode: (toEncode: Int32Array, ecBytes: number) => void;
  };
  ReedSolomonDecoder: new (field: GenericField) => {
    decode: (received: Int32Array, twoS: number) => void;
  };
};

type GenericField = object;

const field = RS.GenericGF.DATA_MATRIX_FIELD_256();
const encoder = new RS.ReedSolomonEncoder(field);
const decoder = new RS.ReedSolomonDecoder(field);

function toInt32(data: Uint8Array): Int32Array {
  const out = new Int32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i];
  return out;
}

function toUint8(data: Int32Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] & 0xff;
  return out;
}

export function rsEncode(message: Uint8Array, parityLen: number): Uint8Array {
  const codeword = toInt32(message);
  const padded = new Int32Array(message.length + parityLen);
  padded.set(codeword);
  encoder.encode(padded, parityLen);
  return toUint8(padded);
}

export function rsDecode(
  codeword: Uint8Array,
  parityLen: number
): { ok: boolean; data: Uint8Array | null } {
  const buf = toInt32(codeword);
  try {
    decoder.decode(buf, parityLen);
    return { ok: true, data: toUint8(buf.subarray(0, buf.length - parityLen)) };
  } catch {
    return { ok: false, data: null };
  }
}

export function corruptByte(data: Uint8Array, index: number, xor = 0xff): Uint8Array {
  const out = Uint8Array.from(data);
  if (index >= 0 && index < out.length) out[index] ^= xor;
  return out;
}
