import {
  WATERMARK_TEMPORAL_PERIOD,
  getWatermarkModulationStrength,
} from "@/lib/watermark/config";
import {
  buildWatermarkPayload,
  toBase64,
} from "@/lib/watermark/crypto/payload";
import { REGION_RECOVERED_THRESHOLD } from "@/lib/watermark/decoder/confidence";
import { verifyWatermarkFrame, type PixelFrame } from "@/lib/watermark/verify-watermark-frame";
import { centerCropVariants, centerCropVariantsFast, cropFrame, MIN_CROP, scaleFrameVariants, scaleFrameVariantsFast } from "@/lib/watermark/decoder/crop-search";
import {
  probeRegionBits,
} from "@/lib/watermark/encoder/spread-spectrum";
import {
  bytesToBits,
  splitCodewordToQuadrants,
} from "@/lib/watermark/encoder/quadrant-encode";
import type { WatermarkDetectionResult } from "@/lib/watermark/types";

export type { PixelFrame } from "@/lib/watermark/verify-watermark-frame";

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
  const { candidate, codeword, spreadSeed } = prepared;
  const verified = verifyWatermarkFrame({
    frame,
    renderConfig: {
      watermarkVersion: candidate.watermarkVersion,
      sessionId: candidate.id,
      spreadSeedB64: toBase64(spreadSeed),
      codewordB64: toBase64(codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: getWatermarkModulationStrength(),
    },
    opaqueWatermarkId: candidate.opaqueWatermarkId,
    contentId: candidate.contentId,
    phase,
  });
  const { finalPass: _finalPass, regionScores: _regionScores, ...result } = verified;
  return result;
}

export type DetectFrameOptions = {
  exhaustive?: boolean;
  /** Creator-scoped admin path — fewer crops/scales/phases. */
  fast?: boolean;
};

/**
 * Two-stage search: a short probe rejects the vast majority of
 * (session, frame phase) combinations, and only survivors pay for a full
 * extraction. A blind scan would otherwise cost one full decode per session per
 * phase, which does not survive contact with a real session table.
 */
export function detectWatermarkInFrame(
  frame: PixelFrame,
  prepared: PreparedCandidate[],
  options: boolean | DetectFrameOptions = false
): WatermarkDetectionResult {
  const opts: DetectFrameOptions =
    typeof options === "boolean" ? { exhaustive: options } : options;
  const exhaustive = opts.exhaustive ?? false;
  const fast = opts.fast ?? false;

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

  const searchPhases = (target: PixelFrame, phases: number[]): boolean => {
    for (const phase of phases) {
      for (const candidate of prepared) {
        const candidateResult = tryCandidate(candidate, phase, target);
        if (candidateResult) {
          const currentBest = best;
          if (!currentBest || candidateResult.confidence > currentBest.confidence) {
            best = candidateResult;
          }
        }
        if (isStrongMatch(best)) return true;
      }
    }
    return isStrongMatch(best);
  };

  // Client embed always uses phase 0.
  if (searchPhases(frame, [0])) return best!;

  if (fast) {
    for (const crop of centerCropVariantsFast(frame)) {
      if (crop.width === frame.width && crop.height === frame.height) continue;
      if (searchPhases(crop, [0])) return best!;
    }
    for (const scaled of scaleFrameVariantsFast(frame)) {
      if (searchPhases(scaled, [0])) return best!;
    }
    if (searchPhases(frame, [1, 2, 3, 4])) return best!;
    if (meetsConfidenceThreshold(best, 0.55)) return best!;
    return best ?? emptyResult();
  }

  for (let phase = 1; phase < WATERMARK_TEMPORAL_PERIOD; phase++) {
    for (const candidate of prepared) {
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
  options?: { exhaustive?: boolean; fast?: boolean }
): WatermarkDetectionResult & { framesAnalyzed: number; candidateFrames: number } {
  const prepared = candidates.map(prepareCandidate);
  const frameOptions: DetectFrameOptions = {
    exhaustive: options?.fast ? false : (options?.exhaustive ?? frames.length === 1),
    fast: options?.fast ?? false,
  };
  let best: WatermarkDetectionResult | null = null;
  let candidateFrames = 0;

  for (const frame of frames) {
    const result = detectWatermarkInFrame(frame, prepared, frameOptions);
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
