import {
  WATERMARK_BLOCK_SIZE,
  WATERMARK_CODEWORD_BYTES,
  WATERMARK_MODULATION_STRENGTH,
} from "@/lib/watermark/config";
import type { ForensicRenderConfig, QuadrantRegion } from "@/lib/watermark/types";
import { REGION_RECOVERED_THRESHOLD, scoreRegionMatch } from "@/lib/watermark/decoder/confidence";
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

export const WATERMARK_STREAM_BITS = WATERMARK_CODEWORD_BYTES * 8;

/** Pixel pairs carrying one bit. Paired samples are adjacent so local gradients
 *  cancel out, which is what makes the modulation recoverable at strengths that
 *  stay invisible. */
const PAIRS_PER_REPEAT = 12;
const REPEATS_PER_BIT = 3;

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function luma(data: Uint8ClampedArray, idx: number): number {
  return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
}

function gcd(a: number, b: number): number {
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/**
 * Deterministic, collision-free plan mapping each sample slot to a horizontally
 * adjacent pixel pair.
 *
 * Slots must not overlap: when two bits modulate the same pixel they cancel each
 * other and nothing is recoverable. Walking the cell space with a stride coprime
 * to its size visits every cell exactly once, which gives disjoint slots without
 * allocating or shuffling a permutation on every frame.
 */
function samplePlan(
  state: { s: number },
  region: QuadrantRegion
): { cellsX: number; cells: number; start: number; stride: number } {
  const cellsX = Math.max(1, Math.floor(region.w / 2));
  const cellsY = Math.max(1, region.h);
  const cells = cellsX * cellsY;
  const start = prngNext(state) % cells;
  let stride = (prngNext(state) % cells) | 1;
  while (gcd(stride, cells) !== 1) stride = (stride + 2) % cells || 1;
  return { cellsX, cells, start, stride };
}

function pairIndex(
  image: ImageLike,
  region: QuadrantRegion,
  plan: ReturnType<typeof samplePlan>,
  slot: number
): number {
  const cell = (plan.start + slot * plan.stride) % plan.cells;
  const x = Math.min(image.width - 2, region.x + (cell % plan.cellsX) * 2);
  const y = Math.min(image.height - 1, region.y + Math.floor(cell / plan.cellsX));
  return (y * image.width + x) * 4;
}

/**
 * Samples per bit, capped by how many disjoint pairs the region actually holds.
 * Asking for more slots than there are cells wraps the walk back onto pixels
 * that already carry another bit, which cancels both.
 */
function slotsPerBit(plan: ReturnType<typeof samplePlan>, planBits: number): number {
  const ideal = PAIRS_PER_REPEAT * REPEATS_PER_BIT;
  return Math.max(1, Math.min(ideal, Math.floor(plan.cells / Math.max(1, planBits))));
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
  const plan = samplePlan(state, region);
  const perBit = slotsPerBit(plan, bits.length);
  const { data } = image;
  let slot = 0;

  for (let bitIdx = 0; bitIdx < bits.length; bitIdx++) {
    const delta = bits[bitIdx] ? strength : -strength;
    for (let s = 0; s < perBit; s++) {
      const aIdx = pairIndex(image, region, plan, slot++);
      const bIdx = aIdx + 4;
      for (let c = 0; c < 3; c++) {
        data[aIdx + c] = clamp(data[aIdx + c] + delta);
        data[bIdx + c] = clamp(data[bIdx + c] - delta);
      }
    }
  }
}

export function extractBitsFromRegion(
  image: ImageLike,
  region: QuadrantRegion,
  spreadSeed: Uint8Array,
  bitCount: number,
  frameIndex: number,
  salt: number,
  planBits: number = WATERMARK_STREAM_BITS
): number[] {
  const state = { s: seedFromBytes(spreadSeed, salt + frameIndex * 9973) };
  const plan = samplePlan(state, region);
  const perBit = slotsPerBit(plan, planBits);
  const { data } = image;
  const bits: number[] = [];
  let slot = 0;

  for (let bitIdx = 0; bitIdx < bitCount; bitIdx++) {
    let acc = 0;
    for (let s = 0; s < perBit; s++) {
      const aIdx = pairIndex(image, region, plan, slot++);
      acc += luma(data, aIdx) - luma(data, aIdx + 4);
    }
    bits.push(acc >= 0 ? 1 : 0);
  }
  return bits;
}

const ANCHORS_PER_FRAME = 3;

export type ForensicRegionPlan = {
  region: QuadrantRegion;
  salt: number;
  strengthScale: number;
};

/**
 * Regions modulated for a given frame.
 *
 * Playback only needs to read back and rewrite these areas, which is why this
 * is exposed separately: copying an entire 1080p frame in and out of canvas on
 * every tick costs more than the modulation itself.
 */
export function forensicFrameRegions(
  width: number,
  height: number,
  frameIndex: number,
  temporalPeriod: number
): { temporalShift: number; regions: ForensicRegionPlan[] } {
  const temporalShift = frameIndex % Math.max(1, temporalPeriod);
  const regions: ForensicRegionPlan[] = centralQuadrantRegions(width, height).map((region) => ({
    region,
    salt: region.key.charCodeAt(0),
    strengthScale: 1,
  }));

  // Anchors sit outside the central box so a cropped capture still carries a
  // full codeword. Only a slice runs per frame to stay inside the frame budget.
  const distributed = distributedAnchorRegions(width, height);
  for (let n = 0; n < ANCHORS_PER_FRAME; n++) {
    const i = (temporalShift * ANCHORS_PER_FRAME + n) % distributed.length;
    regions.push({ region: distributed[i], salt: 1000 + i, strengthScale: 0.85 });
  }

  return { temporalShift, regions };
}

/**
 * Modulates one region held in its own pixel buffer.
 *
 * The sample plan depends only on the region's size, so a detached buffer walks
 * exactly the same cells as the equivalent area inside a full frame.
 */
export function embedRegionPixels(
  pixels: ImageLike,
  plan: ForensicRegionPlan,
  config: ForensicRenderConfig,
  temporalShift: number
): void {
  const quadrants = splitCodewordToQuadrants(fromBase64(config.codewordB64));
  const strength = (config.modulationStrength || WATERMARK_MODULATION_STRENGTH) * plan.strengthScale;
  embedBitsInRegion(
    pixels,
    { key: plan.region.key, x: 0, y: 0, w: plan.region.w, h: plan.region.h },
    bytesToBits(quadrants[plan.region.key]),
    fromBase64(config.spreadSeedB64),
    strength,
    temporalShift,
    plan.salt
  );
}

export function embedInvisibleWatermark(
  image: ImageLike,
  config: ForensicRenderConfig,
  frameIndex: number
): void {
  const quadrants = splitCodewordToQuadrants(fromBase64(config.codewordB64));
  const spreadSeed = fromBase64(config.spreadSeedB64);
  const strength = config.modulationStrength || WATERMARK_MODULATION_STRENGTH;
  const { temporalShift, regions } = forensicFrameRegions(
    image.width,
    image.height,
    frameIndex,
    config.temporalPeriod
  );

  for (const plan of regions) {
    embedBitsInRegion(
      image,
      plan.region,
      bytesToBits(quadrants[plan.region.key]),
      spreadSeed,
      strength * plan.strengthScale,
      temporalShift,
      plan.salt
    );
  }
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
      WATERMARK_STREAM_BITS,
      frameIndex,
      region.key.charCodeAt(0)
    );
    out[region.key] = bitsToBytes(bits);
  }
  return out;
}

/** Anchor streams for a cropped or partially damaged capture. */
export function extractAnchorStreams(
  image: ImageLike,
  spreadSeed: Uint8Array,
  frameIndex: number
): Array<{ key: "A" | "B" | "C" | "D"; stream: Uint8Array }> {
  const distributed = distributedAnchorRegions(image.width, image.height);
  const out: Array<{ key: "A" | "B" | "C" | "D"; stream: Uint8Array }> = [];

  for (let n = 0; n < ANCHORS_PER_FRAME; n++) {
    const i = (frameIndex * ANCHORS_PER_FRAME + n) % distributed.length;
    const region = distributed[i];
    const bits = extractBitsFromRegion(
      image,
      region,
      spreadSeed,
      WATERMARK_STREAM_BITS,
      frameIndex,
      1000 + i
    );
    out.push({ key: region.key, stream: bitsToBytes(bits) });
  }
  return out;
}

/**
 * Cheap first pass for candidate search: reads only the leading bits of one
 * quadrant so the detector can reject a wrong session or frame phase without
 * paying for a full extraction.
 */
export function probeRegionBits(
  image: ImageLike,
  spreadSeed: Uint8Array,
  frameIndex: number,
  bitCount: number
): number[] {
  const region = centralQuadrantRegions(image.width, image.height)[0];
  return extractBitsFromRegion(
    image,
    region,
    spreadSeed,
    bitCount,
    frameIndex,
    region.key.charCodeAt(0)
  );
}

/** Client-side sanity check after embed — rejects silent no-op renders. */
export function verifyEmbeddedWatermark(
  image: ImageLike,
  config: ForensicRenderConfig,
  frameIndex = 0,
  minAgreement = 0.72
): boolean {
  const spreadSeed = fromBase64(config.spreadSeedB64);
  const quadrants = splitCodewordToQuadrants(fromBase64(config.codewordB64));
  const probe = probeRegionBits(image, spreadSeed, frameIndex, 64);
  const expected = bytesToBits(quadrants.A).slice(0, 64);
  let same = 0;
  for (let i = 0; i < 64; i++) if (probe[i] === expected[i]) same++;
  return same / 64 >= minAgreement;
}

/**
 * Stricter client gate before showing watermarked pixels — mirrors admin detector
 * spatial recovery so exportPng / OS screenshots are attributable.
 */
export function verifyForensicCaptureFrame(
  image: ImageLike,
  config: ForensicRenderConfig,
  frameIndex = 0
): boolean {
  const spreadSeed = fromBase64(config.spreadSeedB64);
  const quadrants = splitCodewordToQuadrants(fromBase64(config.codewordB64));
  const regions = centralQuadrantRegions(image.width, image.height);
  let recovered = 0;
  for (const region of regions) {
    const bits = extractBitsFromRegion(
      image,
      region,
      spreadSeed,
      WATERMARK_STREAM_BITS,
      frameIndex,
      region.key.charCodeAt(0)
    );
    const score = scoreRegionMatch(quadrants[region.key], bitsToBytes(bits));
    if (score >= REGION_RECOVERED_THRESHOLD) recovered += 1;
  }
  return recovered >= 2;
}
