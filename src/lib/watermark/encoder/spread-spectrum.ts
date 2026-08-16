import { WATERMARK_BLOCK_SIZE, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";
import type { ForensicRenderConfig, QuadrantRegion } from "@/lib/watermark/types";
import { fromBase64 } from "@/lib/watermark/crypto/payload";
import {
  bytesToBits,
  centralQuadrantRegions,
  distributedAnchorRegions,
  prngNext,
  seedFromBytes,
  splitCodewordToQuadrants,
  bitsToBytes,
} from "@/lib/watermark/encoder/quadrant-encode";

type ImageLike = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function embedBitsInRegion(
  image: ImageLike,
  region: QuadrantRegion,
  bits: number[],
  spreadSeed: Uint8Array,
  strength: number,
  frameIndex: number,
  salt: number
): void {
  const state = { s: seedFromBytes(spreadSeed, salt + frameIndex * 9973) };
  const { width, data } = image;
  const maxBits = Math.min(bits.length, 512);
  const step = Math.max(1, Math.floor((region.w * region.h) / (maxBits * 2)));

  for (let bitIdx = 0; bitIdx < maxBits; bitIdx++) {
    const bit = bits[(bitIdx + frameIndex) % bits.length];
    for (let rep = 0; rep < 2; rep++) {
      const px = (prngNext(state) % Math.max(1, region.w - WATERMARK_BLOCK_SIZE)) + region.x;
      const py = (prngNext(state) % Math.max(1, region.h - WATERMARK_BLOCK_SIZE)) + region.y;
      const bx = px - (px % WATERMARK_BLOCK_SIZE);
      const by = py - (py % WATERMARK_BLOCK_SIZE);
      for (let dy = 0; dy < WATERMARK_BLOCK_SIZE; dy += step) {
        for (let dx = 0; dx < WATERMARK_BLOCK_SIZE; dx += step) {
          const x = Math.min(width - 1, bx + dx);
          const y = Math.min(image.height - 1, by + dy);
          const idx = (y * width + x) * 4;
          const delta = bit ? strength : -strength;
          data[idx] = clamp(data[idx] + delta * 0.299);
          data[idx + 1] = clamp(data[idx + 1] + delta * 0.587);
          data[idx + 2] = clamp(data[idx + 2] + delta * 0.114);
        }
      }
    }
  }
}

export function embedInvisibleWatermark(
  image: ImageLike,
  config: ForensicRenderConfig,
  frameIndex: number
): void {
  const codeword = fromBase64(config.codewordB64);
  const spreadSeed = fromBase64(config.spreadSeedB64);
  const quadrants = splitCodewordToQuadrants(codeword);
  const central = centralQuadrantRegions(image.width, image.height);
  const distributed = distributedAnchorRegions(image.width, image.height);
  const strength = config.modulationStrength || WATERMARK_MODULATION_STRENGTH;
  const temporalShift = frameIndex % Math.max(1, config.temporalPeriod);

  for (const region of central) {
    const stream = quadrants[region.key];
    embedBitsInRegion(
      image,
      region,
      bytesToBits(stream),
      spreadSeed,
      strength,
      temporalShift,
      region.key.charCodeAt(0)
    );
  }

  for (let i = 0; i < distributed.length; i++) {
    const region = distributed[i];
    const stream = quadrants[region.key];
    const rotated = new Uint8Array(stream.length);
    for (let j = 0; j < stream.length; j++) {
      rotated[j] = stream[(j + temporalShift + i) % stream.length];
    }
    embedBitsInRegion(
      image,
      region,
      bytesToBits(rotated),
      spreadSeed,
      strength * 0.85,
      temporalShift + i,
      1000 + i
    );
  }
}

export function extractBitsFromRegion(
  image: ImageLike,
  region: QuadrantRegion,
  spreadSeed: Uint8Array,
  bitCount: number,
  frameIndex: number,
  salt: number
): number[] {
  const state = { s: seedFromBytes(spreadSeed, salt + frameIndex * 9973) };
  const bits: number[] = [];
  const { width, data } = image;
  const step = Math.max(1, Math.floor((region.w * region.h) / (bitCount * 2)));

  for (let bitIdx = 0; bitIdx < bitCount; bitIdx++) {
    let vote = 0;
    for (let rep = 0; rep < 2; rep++) {
      const px = (prngNext(state) % Math.max(1, region.w - WATERMARK_BLOCK_SIZE)) + region.x;
      const py = (prngNext(state) % Math.max(1, region.h - WATERMARK_BLOCK_SIZE)) + region.y;
      const bx = px - (px % WATERMARK_BLOCK_SIZE);
      const by = py - (py % WATERMARK_BLOCK_SIZE);
      let acc = 0;
      let count = 0;
      for (let dy = 0; dy < WATERMARK_BLOCK_SIZE; dy += step) {
        for (let dx = 0; dx < WATERMARK_BLOCK_SIZE; dx += step) {
          const x = Math.min(width - 1, bx + dx);
          const y = Math.min(image.height - 1, by + dy);
          const idx = (y * width + x) * 4;
          const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          acc += lum;
          count++;
        }
      }
      const localMean = acc / Math.max(1, count);
      const centerIdx = (Math.min(image.height - 1, by + 1) * width + Math.min(width - 1, bx + 1)) * 4;
      const centerLum =
        data[centerIdx] * 0.299 + data[centerIdx + 1] * 0.587 + data[centerIdx + 2] * 0.114;
      vote += centerLum >= localMean ? 1 : -1;
    }
    bits.push(vote >= 0 ? 1 : 0);
  }
  return bits;
}

export function extractQuadrantStream(
  image: ImageLike,
  spreadSeed: Uint8Array,
  frameIndex: number
): Record<"A" | "B" | "C" | "D", Uint8Array> {
  const central = centralQuadrantRegions(image.width, image.height);
  const out = {} as Record<"A" | "B" | "C" | "D", Uint8Array>;
  for (const region of central) {
    const bits = extractBitsFromRegion(
      image,
      region,
      spreadSeed,
      384,
      frameIndex,
      region.key.charCodeAt(0)
    );
    out[region.key] = bitsToBytes(bits);
  }
  return out;
}
