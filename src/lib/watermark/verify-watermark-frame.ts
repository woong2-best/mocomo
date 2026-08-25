/**
 * Canonical watermark frame verification — shared by client diagnostics and admin detector.
 * Uses ECC + integrity (HMAC) + spatial quadrant recovery; not client-only spatial gates.
 */

import { WATERMARK_QUADRANT_KEYS } from "@/lib/watermark/config";
import {
  decodeWatermarkCodeword,
  fromBase64,
  comparePayloadIntegrity,
  validateDecodedPayload,
} from "@/lib/watermark/crypto/payload";
import {
  computeDetectionConfidence,
  REGION_RECOVERED_THRESHOLD,
  scoreRegionMatch,
} from "@/lib/watermark/decoder/confidence";
import {
  extractAnchorStreams,
  extractQuadrantStream,
} from "@/lib/watermark/encoder/spread-spectrum";
import { mergeQuadrantStreams, splitCodewordToQuadrants } from "@/lib/watermark/encoder/quadrant-encode";
import type {
  DetectionRegionScore,
  ForensicRenderConfig,
  WatermarkDetectionResult,
  WatermarkDetectionStatus,
} from "@/lib/watermark/types";

export type PixelFrame = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type VerifyWatermarkFrameInput = {
  frame: PixelFrame;
  renderConfig: ForensicRenderConfig;
  opaqueWatermarkId: string;
  contentId: string;
  phase?: number;
  /** Client path: server-provided integrity bytes (no master secret in browser). */
  expectedIntegrityB64?: string;
};

export type VerifyWatermarkFrameResult = WatermarkDetectionResult & {
  finalPass: boolean;
  regionScores: DetectionRegionScore[];
  recoveredCount: number;
  /** Post-merge agreement with session codeword (diagnostic). */
  mergedCodewordAgreement: number;
  /** Whether client integrity bytes were supplied. */
  hasExpectedIntegrity: boolean;
  /** RS decode produced a payload (may still fail integrity). */
  decodeOk: boolean;
};

/** Client/admin shared pass gate: cryptographic integrity required for MATCH. */
export function isCanonicalWatermarkPass(
  result: Pick<WatermarkDetectionResult, "status" | "integrityValid" | "eccValid">
): boolean {
  return (
    (result.status === "MATCH" || result.status === "POSSIBLE_MATCH") &&
    result.integrityValid &&
    result.eccValid
  );
}

/**
 * verifyWatermarkFrame — canonical pipeline:
 * A/B/C/D spatial extract → merge → ECC decode → HMAC integrity → status.
 */
export function verifyWatermarkFrame(input: VerifyWatermarkFrameInput): VerifyWatermarkFrameResult {
  const phase = input.phase ?? 0;
  const spreadSeed = fromBase64(input.renderConfig.spreadSeedB64);
  const quadrants = splitCodewordToQuadrants(fromBase64(input.renderConfig.codewordB64));
  const streams = extractQuadrantStream(input.frame, spreadSeed, phase);

  const regionScores: DetectionRegionScore[] = WATERMARK_QUADRANT_KEYS.map((key) => {
    const score = scoreRegionMatch(quadrants[key], streams[key] ?? new Uint8Array());
    return { key, score, recovered: score >= REGION_RECOVERED_THRESHOLD };
  });

  const weights = Object.fromEntries(
    regionScores.map((r) => [r.key, r.recovered ? 2 : 1])
  ) as Record<(typeof WATERMARK_QUADRANT_KEYS)[number], number>;

  const anchors = extractAnchorStreams(input.frame, spreadSeed, phase);
  const anchorScores = anchors.map((a) => scoreRegionMatch(quadrants[a.key], a.stream));
  const distributedScore = anchorScores.length
    ? anchorScores.reduce((a, b) => a + b, 0) / anchorScores.length
    : 0;

  const merged = mergeQuadrantStreams(
    { A: streams.A, B: streams.B, C: streams.C, D: streams.D },
    weights
  );

  const expectedCodeword = fromBase64(input.renderConfig.codewordB64);
  const mergedCodewordAgreement = scoreRegionMatch(expectedCodeword, merged);

  const decoded = decodeWatermarkCodeword(merged);
  const hasExpectedIntegrity = Boolean(input.expectedIntegrityB64?.trim());
  let integrityValid = false;
  if (decoded.ok && decoded.core) {
    if (hasExpectedIntegrity) {
      try {
        integrityValid = comparePayloadIntegrity(
          decoded.core,
          fromBase64(input.expectedIntegrityB64!)
        );
      } catch {
        integrityValid = false;
      }
    } else {
      integrityValid = validateDecodedPayload(decoded.core, input.opaqueWatermarkId);
    }
  }

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

  const recoveredCount = regionScores.filter((r) => r.recovered).length;

  const result: VerifyWatermarkFrameResult = {
    detected: status === "MATCH" || status === "POSSIBLE_MATCH",
    status,
    confidence,
    watermarkVersion: input.renderConfig.watermarkVersion,
    sessionId: input.renderConfig.sessionId,
    contentId: input.contentId,
    opaqueWatermarkId: input.opaqueWatermarkId,
    detectedRegions: regionScores,
    temporalMatches: anchorScores.filter((s) => s >= REGION_RECOVERED_THRESHOLD).length,
    distributedScore,
    centralScore,
    integrityValid,
    eccValid: decoded.eccValid,
    recoveredCount,
    finalPass: isCanonicalWatermarkPass({ status, integrityValid, eccValid: decoded.eccValid }),
    regionScores,
    mergedCodewordAgreement,
    hasExpectedIntegrity,
    decodeOk: decoded.ok,
  };

  return result;
}

export function formatVerifyRetryReason(result: VerifyWatermarkFrameResult): string {
  const parts: string[] = [];
  if (!result.hasExpectedIntegrity) parts.push("missing_expected_integrity");
  if (result.eccValid === false) parts.push("ecc_failed");
  else if (result.eccValid !== true) parts.push("ecc_unset");
  if (result.integrityValid === false) parts.push("integrity_failed");
  else if (result.integrityValid !== true && result.hasExpectedIntegrity) {
    parts.push("integrity_unset");
  }
  if (!result.decodeOk && result.recoveredCount >= 1) parts.push("decode_failed");
  if (result.recoveredCount >= 1 && result.mergedCodewordAgreement < REGION_RECOVERED_THRESHOLD) {
    parts.push("merged_codeword_weak");
  }
  if (result.recoveredCount < 1) parts.push("quadrant_recovery");
  if (result.status === "NOT_DETECTED") parts.push("not_detected");
  if (result.status === "INCONCLUSIVE") parts.push("inconclusive");
  return parts.length ? parts.join(",") : `status_${result.status}`;
}

export function quadrantScoresFromResult(
  result: VerifyWatermarkFrameResult
): Partial<Record<(typeof WATERMARK_QUADRANT_KEYS)[number], number>> {
  const out: Partial<Record<(typeof WATERMARK_QUADRANT_KEYS)[number], number>> = {};
  for (const r of result.regionScores) out[r.key] = r.score;
  return out;
}
