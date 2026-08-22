import {
  WATERMARK_QUADRANT_KEYS,
  WATERMARK_TEMPORAL_PERIOD,
} from "@/lib/watermark/config";
import {
  buildWatermarkPayload,
  decodeWatermarkCodeword,
  validateDecodedPayload,
} from "@/lib/watermark/crypto/payload";
import {
  computeDetectionConfidence,
  REGION_RECOVERED_THRESHOLD,
  scoreRegionMatch,
} from "@/lib/watermark/decoder/confidence";
import { centerCropVariants, cropFrame, MIN_CROP, scaleFrameVariants } from "@/lib/watermark/decoder/crop-search";
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
  purchaseId: string | null;
  episodePurchaseId?: string | null;
  subscriptionId?: string | null;
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
    // Must mirror how createWatermarkSession derived the access reference, or
    // the recomputed codeword will not match what was embedded.
    purchaseId:
      candidate.purchaseId ??
      candidate.episodePurchaseId ??
      `sub:${candidate.subscriptionId}`,
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

function isStrongMatch(
  result: WatermarkDetectionResult | null
): result is WatermarkDetectionResult & { status: "MATCH"; integrityValid: true } {
  return result !== null && result.status === "MATCH" && result.integrityValid;
}

function meetsConfidenceThreshold(
  result: WatermarkDetectionResult | null,
  minConfidence: number
): result is WatermarkDetectionResult & { integrityValid: true } {
  return result !== null && result.confidence >= minConfidence && result.integrityValid;
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
    return { key, score, recovered: score >= REGION_RECOVERED_THRESHOLD };
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
    temporalMatches: anchorScores.filter((s) => s >= REGION_RECOVERED_THRESHOLD).length,
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
  prepared: PreparedCandidate[],
  exhaustive = false
): WatermarkDetectionResult {
  let best: WatermarkDetectionResult | null = null;

  const tryCandidate = (
    candidate: PreparedCandidate,
    phase: number,
    target: PixelFrame
  ): WatermarkDetectionResult | null => {
    const probe = probeRegionBits(target, candidate.spreadSeed, phase, PROBE_BITS);
    if (bitAgreement(probe, candidate.probeBits) < PROBE_THRESHOLD) return null;
    return verifyCandidate(target, candidate, phase);
  };

  for (const candidate of prepared) {
    for (let phase = 0; phase < WATERMARK_TEMPORAL_PERIOD; phase++) {
      const candidateResult = tryCandidate(candidate, phase, frame);
      if (candidateResult) {
        const currentBest = best;
        if (!currentBest || candidateResult.confidence > currentBest.confidence) {
          best = candidateResult;
        }
      }
      if (isStrongMatch(best)) return best;
    }
  }

  if (meetsConfidenceThreshold(best, 0.55)) return best;

  for (const scaled of scaleFrameVariants(frame)) {
    for (const candidate of prepared) {
      for (let phase = 0; phase < WATERMARK_TEMPORAL_PERIOD; phase++) {
        const candidateResult = tryCandidate(candidate, phase, scaled);
        if (candidateResult) {
          const currentBest = best;
          if (!currentBest || candidateResult.confidence > currentBest.confidence) {
            best = candidateResult;
          }
        }
        if (isStrongMatch(best)) return best;
      }
    }
    if (meetsConfidenceThreshold(best, 0.75)) return best;
  }

  for (const crop of centerCropVariants(frame)) {
    if (crop.width === frame.width && crop.height === frame.height) continue;
    for (const candidate of prepared) {
      for (let phase = 0; phase < WATERMARK_TEMPORAL_PERIOD; phase++) {
        const candidateResult = tryCandidate(candidate, phase, crop);
        if (candidateResult) {
          const currentBest = best;
          if (!currentBest || candidateResult.confidence > currentBest.confidence) {
            best = candidateResult;
          }
        }
        if (isStrongMatch(best)) return best;
      }
    }
    if (meetsConfidenceThreshold(best, 0.75)) return best;
  }

  if (
    exhaustive &&
    (!best || best.status !== "MATCH" || !best.integrityValid)
  ) {
    const minW = Math.max(MIN_CROP, Math.round(frame.width * 0.25));
    const maxW = Math.round(frame.width * 0.88);
    const aspects = [16 / 9, 4 / 3, 3 / 4, 1, 9 / 16];
    for (let w = minW; w <= maxW; w += 2) {
      for (const aspect of aspects) {
        const h = Math.round(w / aspect);
        if (h < MIN_CROP || h > frame.height) continue;
        const x = Math.max(0, Math.round((frame.width - w) / 2));
        const y = Math.max(0, Math.round((frame.height - h) / 2));
        const crop = cropFrame(frame, x, y, w, h);
        for (const candidate of prepared) {
          for (let phase = 0; phase < WATERMARK_TEMPORAL_PERIOD; phase++) {
            const candidateResult = tryCandidate(candidate, phase, crop);
        if (candidateResult) {
          const currentBest = best;
          if (!currentBest || candidateResult.confidence > currentBest.confidence) {
            best = candidateResult;
          }
        }
            if (isStrongMatch(best)) return best;
          }
        }
      }
    }
  }

  return best ?? emptyResult();
}

export function detectWatermarkInFrames(
  frames: PixelFrame[],
  candidates: DetectionCandidate[],
  options?: { exhaustive?: boolean }
): WatermarkDetectionResult & { framesAnalyzed: number; candidateFrames: number } {
  const prepared = candidates.map(prepareCandidate);
  const exhaustive = options?.exhaustive ?? frames.length === 1;
  let best: WatermarkDetectionResult | null = null;
  let candidateFrames = 0;

  for (const frame of frames) {
    const result = detectWatermarkInFrame(frame, prepared, exhaustive);
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
