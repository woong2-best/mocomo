import {
  WATERMARK_QUADRANT_KEYS,
  WATERMARK_TEMPORAL_PERIOD,
} from "@/lib/watermark/config";
import {
  buildWatermarkPayload,
  decodeWatermarkCodeword,
  validateDecodedPayload,
} from "@/lib/watermark/crypto/payload";
import { computeDetectionConfidence, scoreRegionMatch } from "@/lib/watermark/decoder/confidence";
import {
  extractAnchorStreams,
  extractQuadrantStream,
  probeRegionBits,
} from "@/lib/watermark/encoder/spread-spectrum";
import {
  bytesToBits,
  mergeQuadrantStreams,
  splitCodewordToQuadrants,
} from "@/lib/watermark/encoder/quadrant-encode";
import type { DetectionRegionScore, WatermarkDetectionResult } from "@/lib/watermark/types";

export type PixelFrame = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

/** A session with everything needed to recompute its carrier deterministically. */
export type DetectionCandidate = {
  id: string;
  contentId: string;
  userId: string;
  purchaseId: string;
  sessionNonce: string;
  watermarkVersion: number;
  opaqueWatermarkId: string;
};

/** Leading bits compared during the cheap pass. Long enough that a wrong
 *  candidate almost never clears the threshold, short enough to run thousands
 *  of times per request. */
const PROBE_BITS = 64;
const PROBE_THRESHOLD = 0.72;

type PreparedCandidate = {
  candidate: DetectionCandidate;
  codeword: Uint8Array;
  spreadSeed: Uint8Array;
  quadrants: ReturnType<typeof splitCodewordToQuadrants>;
  probeBits: number[];
};

export function prepareCandidate(candidate: DetectionCandidate): PreparedCandidate {
  const built = buildWatermarkPayload({
    contentId: candidate.contentId,
    sessionId: candidate.id,
    userId: candidate.userId,
    purchaseId: candidate.purchaseId,
    watermarkVersion: candidate.watermarkVersion,
    sessionNonce: candidate.sessionNonce,
  });
  const quadrants = splitCodewordToQuadrants(built.codeword);
  return {
    candidate,
    codeword: built.codeword,
    spreadSeed: built.spreadSeed,
    quadrants,
    probeBits: bytesToBits(quadrants.A).slice(0, PROBE_BITS),
  };
}

function bitAgreement(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let same = 0;
  for (let i = 0; i < len; i++) if (a[i] === b[i]) same++;
  return same / len;
}

function emptyResult(): WatermarkDetectionResult {
  return {
    detected: false,
    status: "NOT_DETECTED",
    confidence: 0,
    watermarkVersion: null,
    sessionId: null,
    contentId: null,
    opaqueWatermarkId: null,
    detectedRegions: [],
    temporalMatches: 0,
    distributedScore: 0,
    centralScore: 0,
    integrityValid: false,
    eccValid: false,
  };
}

function verifyCandidate(
  frame: PixelFrame,
  prepared: PreparedCandidate,
  phase: number
): WatermarkDetectionResult {
  const { candidate, spreadSeed, quadrants } = prepared;
  const streams = extractQuadrantStream(frame, spreadSeed, phase);

  const regionScores: DetectionRegionScore[] = WATERMARK_QUADRANT_KEYS.map((key) => {
    const score = scoreRegionMatch(quadrants[key], streams[key] ?? new Uint8Array());
    return { key, score, recovered: score >= 0.55 };
  });

  const weights = Object.fromEntries(
    regionScores.map((r) => [r.key, r.recovered ? 2 : 1])
  ) as Record<(typeof WATERMARK_QUADRANT_KEYS)[number], number>;

  const anchors = extractAnchorStreams(frame, spreadSeed, phase);
  const anchorScores = anchors.map((a) => scoreRegionMatch(quadrants[a.key], a.stream));
  const distributedScore = anchorScores.length
    ? anchorScores.reduce((a, b) => a + b, 0) / anchorScores.length
    : 0;

  const merged = mergeQuadrantStreams(
    {
      A: streams.A,
      B: streams.B,
      C: streams.C,
      D: streams.D,
    },
    weights
  );

  const decoded = decodeWatermarkCodeword(merged);
  const integrityValid =
    decoded.ok && decoded.core
      ? validateDecodedPayload(decoded.core, candidate.opaqueWatermarkId)
      : false;

  const centralScore =
    regionScores.reduce((a, r) => a + r.score, 0) / Math.max(1, regionScores.length);

  const { confidence, status } = computeDetectionConfidence({
    centralScore,
    distributedScore,
    temporalScore: Math.max(centralScore, distributedScore),
    eccValid: decoded.eccValid,
    integrityValid,
    regionScores,
  });

  return {
    detected: status === "MATCH" || status === "POSSIBLE_MATCH",
    status,
    confidence,
    watermarkVersion: candidate.watermarkVersion,
    sessionId: candidate.id,
    contentId: candidate.contentId,
    opaqueWatermarkId: candidate.opaqueWatermarkId,
    detectedRegions: regionScores,
    temporalMatches: anchorScores.filter((s) => s >= 0.55).length,
    distributedScore,
    centralScore,
    integrityValid,
    eccValid: decoded.eccValid,
  };
}

/**
 * Two-stage search: a short probe rejects the vast majority of
 * (session, frame phase) combinations, and only survivors pay for a full
 * extraction. A blind scan would otherwise cost one full decode per session per
 * phase, which does not survive contact with a real session table.
 */
export function detectWatermarkInFrame(
  frame: PixelFrame,
  prepared: PreparedCandidate[]
): WatermarkDetectionResult {
  let best: WatermarkDetectionResult | null = null;

  for (const candidate of prepared) {
    for (let phase = 0; phase < WATERMARK_TEMPORAL_PERIOD; phase++) {
      const probe = probeRegionBits(frame, candidate.spreadSeed, phase, PROBE_BITS);
      if (bitAgreement(probe, candidate.probeBits) < PROBE_THRESHOLD) continue;

      const result = verifyCandidate(frame, candidate, phase);
      if (!best || result.confidence > best.confidence) best = result;
      if (result.status === "MATCH" && result.integrityValid) return result;
    }
  }

  return best ?? emptyResult();
}

export function detectWatermarkInFrames(
  frames: PixelFrame[],
  candidates: DetectionCandidate[]
): WatermarkDetectionResult & { framesAnalyzed: number; candidateFrames: number } {
  const prepared = candidates.map(prepareCandidate);
  let best: WatermarkDetectionResult | null = null;
  let candidateFrames = 0;

  for (const frame of frames) {
    const result = detectWatermarkInFrame(frame, prepared);
    if (result.confidence > 0.35) candidateFrames++;
    if (!best || result.confidence > best.confidence) best = result;
    if (result.status === "MATCH" && result.integrityValid) {
      return { ...result, framesAnalyzed: frames.length, candidateFrames };
    }
  }

  return {
    ...(best ?? emptyResult()),
    framesAnalyzed: frames.length,
    candidateFrames,
  };
}

export async function decodeImageToFrame(buf: Buffer): Promise<PixelFrame> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(buf)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}
