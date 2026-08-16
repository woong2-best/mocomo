import type { DetectionRegionScore, WatermarkDetectionStatus } from "@/lib/watermark/types";

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
  if (confidence >= 0.8 && input.integrityValid && input.eccValid && recoveredCount >= 2) {
    status = "MATCH";
  } else if (confidence >= 0.6 && recoveredCount >= 1) {
    status = "POSSIBLE_MATCH";
  } else if (confidence >= 0.35) {
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
