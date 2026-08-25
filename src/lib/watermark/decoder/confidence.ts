import type { DetectionRegionScore, WatermarkDetectionStatus } from "@/lib/watermark/types";

/** Random texture / wrong-session comparisons cluster around 50% bit agreement. */
export const REGION_BIT_AGREEMENT_NOISE = 0.5;

/** Quadrant stream must exceed noise before it counts as recovered evidence. */
export const REGION_RECOVERED_THRESHOLD = 0.82;

/** Central spatial agreement below this is treated as no forensic signal. */
export const SPATIAL_SIGNAL_THRESHOLD = 0.72;

/**
 * Client pre-display embed gate: merged stream vs intended session codeword.
 * RS(48,32) on a noisy merge typically needs ~0.97+ agreement; embed sanity uses
 * spatial 4/4 + merged ≥ this threshold + session integrity (admin/leak path stays strict RS).
 */
export const CLIENT_EMBED_MERGED_THRESHOLD = 0.9;

export function scoreRegionMatch(expected: Uint8Array, recovered: Uint8Array): number {
  const len = Math.min(expected.length, recovered.length, 64);
  if (len === 0) return 0;
  let match = 0;
  for (let i = 0; i < len; i++) {
    const diff = expected[i] ^ recovered[i];
    match += 8 - popcount(diff);
  }
  return match / (len * 8);
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>>= 1;
  }
  return c;
}

export function computeDetectionConfidence(input: {
  centralScore: number;
  distributedScore: number;
  temporalScore: number;
  eccValid: boolean;
  integrityValid: boolean;
  regionScores: DetectionRegionScore[];
}): { confidence: number; status: WatermarkDetectionStatus } {
  const recoveredCount = input.regionScores.filter((r) => r.recovered).length;
  const regionFactor = recoveredCount / Math.max(1, input.regionScores.length);

  let confidence =
    input.centralScore * 0.35 +
    input.distributedScore * 0.2 +
    input.temporalScore * 0.2 +
    regionFactor * 0.15 +
    (input.eccValid ? 0.05 : 0) +
    (input.integrityValid ? 0.05 : 0);

  confidence = Math.max(0, Math.min(1, confidence));

  let status: WatermarkDetectionStatus = "NOT_DETECTED";
  const aboveNoise =
    input.centralScore >= SPATIAL_SIGNAL_THRESHOLD ||
    input.distributedScore >= SPATIAL_SIGNAL_THRESHOLD;

  if (confidence >= 0.8 && input.integrityValid && input.eccValid && recoveredCount >= 2) {
    status = "MATCH";
  } else if (
    input.integrityValid &&
    input.eccValid &&
    recoveredCount >= 1 &&
    confidence >= 0.65
  ) {
    status = "POSSIBLE_MATCH";
  } else if (
    aboveNoise &&
    (input.eccValid || input.integrityValid || recoveredCount >= 2) &&
    confidence >= 0.55
  ) {
    status = "INCONCLUSIVE";
  }

  return { confidence, status };
}

export function formatDetectionMessage(status: WatermarkDetectionStatus): string {
  switch (status) {
    case "MATCH":
      return "This leaked media contains a forensic watermark associated with the following viewing session.";
    case "POSSIBLE_MATCH":
      return "Partial watermark signals were detected. Additional analysis is recommended.";
    case "INCONCLUSIVE":
      return "Insufficient forensic signal evidence to identify a watermark session.";
    default:
      return "No forensic watermark signal was detected in the submitted media.";
  }
}
