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

export function distributedAnchorRegions(width: number, height: number): QuadrantRegion[] {
  const regions: QuadrantRegion[] = [];
  const marginX = Math.round(width * 0.08);
  const marginY = Math.round(height * 0.08);
  const cellW = Math.max(WATERMARK_BLOCK_SIZE * 4, Math.round((width - marginX * 2) / 4));
  const cellH = Math.max(WATERMARK_BLOCK_SIZE * 4, Math.round((height - marginY * 2) / 3));

  for (let i = 0; i < WATERMARK_DISTRIBUTED_ANCHORS; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    regions.push({
      key: WATERMARK_QUADRANT_KEYS[i % 4],
      x: marginX + col * cellW + Math.round(cellW * 0.25),
      y: marginY + row * cellH + Math.round(cellH * 0.25),
      w: Math.min(cellW, width - marginX),
      h: Math.min(cellH, height - marginY),
    });
  }
  return regions;
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
