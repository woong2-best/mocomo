import {
  WATERMARK_BLOCK_SIZE,
  WATERMARK_CODEWORD_BYTES,
  WATERMARK_DISTRIBUTED_ANCHORS,
  WATERMARK_QUADRANT_KEYS,
  type WatermarkQuadrantKey,
} from "@/lib/watermark/config";
import type { QuadrantRegion } from "@/lib/watermark/types";

export function prngNext(state: { s: number }): number {
  let x = state.s >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.s = x >>> 0;
  return state.s;
}

export function seedFromBytes(seed: Uint8Array, salt: number): number {
  let h = salt >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h ^ seed[i], 16777619) >>> 0) >>> 0;
  }
  return h >>> 0 || 0x9e3779b9;
}

export function splitCodewordToQuadrants(codeword: Uint8Array): Record<WatermarkQuadrantKey, Uint8Array> {
  const out = {} as Record<WatermarkQuadrantKey, Uint8Array>;
  for (let q = 0; q < WATERMARK_QUADRANT_KEYS.length; q++) {
    const key = WATERMARK_QUADRANT_KEYS[q];
    const stream = new Uint8Array(WATERMARK_CODEWORD_BYTES);
    for (let i = 0; i < WATERMARK_CODEWORD_BYTES; i++) {
      const mask = quadrantMask(i, q);
      stream[i] = (codeword[i % codeword.length] ?? 0) ^ mask;
    }
    out[key] = stream;
  }
  return out;
}

function quadrantMask(index: number, quadrant: number): number {
  return ((index + 1) * (quadrant + 3) * 17) & 0xff;
}

export function demaskQuadrantStream(stream: Uint8Array, quadrant: number): Uint8Array {
  const out = new Uint8Array(WATERMARK_CODEWORD_BYTES);
  for (let i = 0; i < WATERMARK_CODEWORD_BYTES; i++) {
    out[i] = (stream[i] ?? 0) ^ quadrantMask(i, quadrant);
  }
  return out;
}

export function mergeQuadrantStreams(
  streams: Partial<Record<WatermarkQuadrantKey, Uint8Array | null>>,
  weights: Partial<Record<WatermarkQuadrantKey, number>>
): Uint8Array {
  const out = new Uint8Array(WATERMARK_CODEWORD_BYTES).fill(0);
  const votes = new Uint16Array(WATERMARK_CODEWORD_BYTES * 256).fill(0);

  for (let q = 0; q < WATERMARK_QUADRANT_KEYS.length; q++) {
    const key = WATERMARK_QUADRANT_KEYS[q];
    const stream = streams[key];
    if (!stream) continue;
    const w = weights[key] ?? 1;
    const demasked = demaskQuadrantStream(stream, q);
    for (let i = 0; i < WATERMARK_CODEWORD_BYTES; i++) {
      votes[i * 256 + demasked[i]] += w;
    }
  }

  for (let i = 0; i < WATERMARK_CODEWORD_BYTES; i++) {
    let best = 0;
    let bestCount = 0;
    for (let v = 0; v < 256; v++) {
      const c = votes[i * 256 + v];
      if (c > bestCount) {
        bestCount = c;
        best = v;
      }
    }
    out[i] = best;
  }
  return out;
}

export function centralQuadrantRegions(width: number, height: number): QuadrantRegion[] {
  const boxW = Math.round(width * 0.42);
  const boxH = Math.round(height * 0.42);
  const left = Math.round((width - boxW) / 2);
  const top = Math.round((height - boxH) / 2);
  const halfW = Math.floor(boxW / 2);
  const halfH = Math.floor(boxH / 2);
  return [
    { key: "A", x: left, y: top, w: halfW, h: halfH },
    { key: "B", x: left + halfW, y: top, w: boxW - halfW, h: halfH },
    { key: "C", x: left, y: top + halfH, w: halfW, h: boxH - halfH },
    { key: "D", x: left + halfW, y: top + halfH, w: boxW - halfW, h: boxH - halfH },
  ];
}

/**
 * Anchors live in the ring outside the central box. They must not overlap the
 * central quadrants: two regions modulating the same pixel cancel each other,
 * and overlapping anchors would erase the primary signal they are meant to back
 * up. The ring placement also means a capture cropped to the subject still keeps
 * the central copy, while a capture cropped to a corner keeps an anchor copy.
 */
export function distributedAnchorRegions(width: number, height: number): QuadrantRegion[] {
  const boxW = Math.round(width * 0.42);
  const boxH = Math.round(height * 0.42);
  const left = Math.round((width - boxW) / 2);
  const top = Math.round((height - boxH) / 2);
  const right = left + boxW;
  const bottom = top + boxH;

  const bandW = Math.max(WATERMARK_BLOCK_SIZE * 4, Math.floor(width / 4));
  const sideW = Math.max(WATERMARK_BLOCK_SIZE * 4, left);
  const regions: QuadrantRegion[] = [];

  for (let col = 0; col < 4; col++) {
    regions.push({ key: WATERMARK_QUADRANT_KEYS[col], x: col * bandW, y: 0, w: bandW, h: top });
    regions.push({
      key: WATERMARK_QUADRANT_KEYS[col],
      x: col * bandW,
      y: bottom,
      w: bandW,
      h: Math.max(1, height - bottom),
    });
  }

  for (let row = 0; row < 2; row++) {
    const bandH = Math.max(1, Math.floor(boxH / 2));
    regions.push({ key: WATERMARK_QUADRANT_KEYS[row], x: 0, y: top + row * bandH, w: sideW, h: bandH });
    regions.push({
      key: WATERMARK_QUADRANT_KEYS[row + 2],
      x: right,
      y: top + row * bandH,
      w: Math.max(1, width - right),
      h: bandH,
    });
  }

  return regions.slice(0, WATERMARK_DISTRIBUTED_ANCHORS);
}

export function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  return bits;
}

export function bitsToBytes(bits: number[]): Uint8Array {
  const len = Math.ceil(bits.length / 8);
  const out = new Uint8Array(len);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) out[i >> 3] |= 1 << (7 - (i & 7));
  }
  return out;
}
