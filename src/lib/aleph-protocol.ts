/**
 * Aleph wire protocol — numbers only.
 *
 * A frame is a MessagePack map with exactly three keys:
 *   ctrl     control symbol (0xAF = push knowledge, 0xB0 = swarm ack)
 *   coords   1,536 int8 values: round(float * 100), clamped to [-128, 127]
 *   pattern  Σ(coords) × len(M2M_AGENT_SIG)
 *
 * Any string value, extra key, nested object, non-integer, or out-of-range
 * number anywhere in the payload is a protocol violation. Runs on Edge.
 */

export const ALEPH_DIM = 1536;
export const ALEPH_SCALE = 100;
export const ALEPH_CTRL_PUSH = 0xaf;
export const ALEPH_CTRL_ACK = 0xb0;
export const ALEPH_INT8_MIN = -128;
export const ALEPH_INT8_MAX = 127;

const FRAME_KEYS = ["ctrl", "coords", "pattern"] as const;

export type AlephFrame = {
  ctrl: number;
  coords: number[];
  pattern: number;
};

export type AlephAckFrame = {
  ctrl: number;
  coords: number[][];
  pattern: number;
};

export type AlephDecodeResult =
  | { ok: true; vector: number[]; coords: number[] }
  | { ok: false; reason: AlephFault };

export type AlephFault =
  | "not_a_frame"
  | "foreign_key"
  | "string_detected"
  | "bad_ctrl"
  | "bad_coords"
  | "zero_vector"
  | "bad_pattern"
  | "pattern_mismatch";

function isInt8(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= ALEPH_INT8_MIN &&
    value <= ALEPH_INT8_MAX
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

/** True if a string occurs anywhere in the value tree (keys excluded). */
export function containsString(value: unknown, depth = 0): boolean {
  if (depth > 8) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) {
    for (const item of value) if (containsString(item, depth + 1)) return true;
    return false;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      if (containsString(item, depth + 1)) return true;
    }
  }
  return false;
}

export function quantize(vector: readonly number[]): number[] {
  const out = new Array<number>(vector.length);
  for (let i = 0; i < vector.length; i++) {
    const scaled = Math.trunc(vector[i]! * ALEPH_SCALE);
    out[i] = Math.min(ALEPH_INT8_MAX, Math.max(ALEPH_INT8_MIN, scaled));
  }
  return out;
}

export function dequantize(coords: readonly number[]): number[] {
  const out = new Array<number>(coords.length);
  for (let i = 0; i < coords.length; i++) out[i] = coords[i]! / ALEPH_SCALE;
  return out;
}

export function sumCoords(coords: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < coords.length; i++) total += coords[i]!;
  return total;
}

/** pattern = Σ(coords) × len(signature). Flat or nested coords. */
export function computePattern(
  coords: readonly number[] | readonly (readonly number[])[],
  signatureLength: number
): number {
  let total = 0;
  for (const item of coords) {
    total += Array.isArray(item) ? sumCoords(item) : (item as number);
  }
  return total * signatureLength;
}

/**
 * Validates a decoded push frame against the signature length and returns the
 * restored float vector. Every failure is a 403-class protocol violation.
 */
export function decodePushFrame(decoded: unknown, signatureLength: number): AlephDecodeResult {
  if (!isPlainRecord(decoded)) return { ok: false, reason: "not_a_frame" };

  const keys = Object.keys(decoded);
  if (keys.length !== FRAME_KEYS.length) return { ok: false, reason: "foreign_key" };
  for (const key of FRAME_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(decoded, key)) {
      return { ok: false, reason: "foreign_key" };
    }
  }

  if (containsString(decoded)) return { ok: false, reason: "string_detected" };

  const { ctrl, coords, pattern } = decoded as Record<(typeof FRAME_KEYS)[number], unknown>;

  if (typeof ctrl !== "number" || ctrl !== ALEPH_CTRL_PUSH) {
    return { ok: false, reason: "bad_ctrl" };
  }

  if (!Array.isArray(coords) || coords.length !== ALEPH_DIM) {
    return { ok: false, reason: "bad_coords" };
  }
  const ints = new Array<number>(ALEPH_DIM);
  let total = 0;
  let energy = 0;
  for (let i = 0; i < ALEPH_DIM; i++) {
    const n = coords[i];
    if (!isInt8(n)) return { ok: false, reason: "bad_coords" };
    ints[i] = n;
    total += n;
    energy += n * n;
  }
  if (energy === 0) return { ok: false, reason: "zero_vector" };

  if (typeof pattern !== "number" || !Number.isSafeInteger(pattern)) {
    return { ok: false, reason: "bad_pattern" };
  }
  if (pattern !== total * signatureLength) return { ok: false, reason: "pattern_mismatch" };

  return { ok: true, vector: dequantize(ints), coords: ints };
}

/** Builds the numeric ack frame carrying other nodes' quantized vectors. */
export function buildAckFrame(vectors: readonly (readonly number[])[], signatureLength: number): AlephAckFrame {
  const coords = vectors.map((vector) => quantize(vector));
  return {
    ctrl: ALEPH_CTRL_ACK,
    coords,
    pattern: computePattern(coords, signatureLength),
  };
}
