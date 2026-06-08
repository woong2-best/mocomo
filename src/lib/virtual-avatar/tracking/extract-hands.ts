import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type {
  FingerBends,
  HandTrackingState,
  HandsTrackingState,
} from "@/lib/virtual-avatar/tracking/types";
import type { TrackingSmoother } from "@/lib/virtual-avatar/tracking/smooth";

const CHAINS = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  little: [17, 18, 19, 20],
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fingerBend(
  lms: { x: number; y: number; z: number }[],
  a: number,
  b: number,
  c: number
): number {
  const v1x = lms[a].x - lms[b].x;
  const v1y = lms[a].y - lms[b].y;
  const v2x = lms[c].x - lms[b].x;
  const v2y = lms[c].y - lms[b].y;
  const l1 = Math.hypot(v1x, v1y);
  const l2 = Math.hypot(v2x, v2y);
  if (l1 < 1e-6 || l2 < 1e-6) return 0;
  const dot = clamp((v1x * v2x + v1y * v2y) / (l1 * l2), -1, 1);
  return clamp((Math.PI - Math.acos(dot)) / Math.PI, 0, 1);
}

function extractFinger(
  lms: { x: number; y: number; z: number }[],
  chain: readonly number[],
  prefix: string,
  smoother: TrackingSmoother,
  dt: number
): FingerBends {
  const b0 = fingerBend(lms, chain[0], chain[1], chain[2]);
  const b1 = fingerBend(lms, chain[1], chain[2], chain[3]);
  const b2 = fingerBend(lms, chain[0], chain[2], chain[3]) * 0.5;
  return [
    smoother.smoothHandAngle(`${prefix}_0`, b0, dt),
    smoother.smoothHandAngle(`${prefix}_1`, b1, dt),
    smoother.smoothHandAngle(`${prefix}_2`, b2, dt),
  ];
}

function extractOneHand(
  lms: { x: number; y: number; z: number }[],
  side: "L" | "R",
  smoother: TrackingSmoother,
  dt: number
): HandTrackingState {
  return {
    detected: true,
    thumb: extractFinger(lms, CHAINS.thumb, `${side}T`, smoother, dt),
    index: extractFinger(lms, CHAINS.index, `${side}I`, smoother, dt),
    middle: extractFinger(lms, CHAINS.middle, `${side}M`, smoother, dt),
    ring: extractFinger(lms, CHAINS.ring, `${side}R`, smoother, dt),
    little: extractFinger(lms, CHAINS.little, `${side}P`, smoother, dt),
  };
}

export function extractHands(
  result: HandLandmarkerResult | undefined,
  smoother: TrackingSmoother,
  dt: number
): HandsTrackingState {
  if (!result?.landmarks?.length) return { left: null, right: null };

  let left: HandTrackingState | null = null;
  let right: HandTrackingState | null = null;

  for (let i = 0; i < result.landmarks.length; i++) {
    const lms = result.landmarks[i];
    if (!lms || lms.length < 21) continue;
    const label = result.handednesses?.[i]?.[0]?.categoryName ?? "";
    const isLeft = label === "Left";
    const hand = extractOneHand(lms, isLeft ? "L" : "R", smoother, dt);
    if (isLeft) left = hand;
    else right = hand;
  }

  return { left, right };
}
