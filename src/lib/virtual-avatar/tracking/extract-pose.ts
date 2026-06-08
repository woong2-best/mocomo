import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import type { BodyTrackingState, LegTrackingState, PelvisTrackingState } from "@/lib/virtual-avatar/tracking/types";
import type { TrackingSmoother } from "@/lib/virtual-avatar/tracking/smooth";
import { solveArmIk } from "@/lib/virtual-avatar/tracking/arm-ik";
import { wristTargetFromLandmarks } from "@/lib/virtual-avatar/tracking/ccd-arm-ik";

const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT: 31,
  RIGHT_FOOT: 32,
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function jointBend(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): number {
  const v1x = ax - bx;
  const v1y = ay - by;
  const v2x = cx - bx;
  const v2y = cy - by;
  const l1 = Math.hypot(v1x, v1y);
  const l2 = Math.hypot(v2x, v2y);
  if (l1 < 1e-5 || l2 < 1e-5) return 0;
  return Math.PI - Math.acos(clamp((v1x * v2x + v1y * v2y) / (l1 * l2), -1, 1));
}

function pt(result: PoseLandmarkerResult, idx: number) {
  const lm = result.landmarks[0]?.[idx];
  if (!lm) return null;
  return { x: lm.x, y: lm.y, z: lm.z, v: lm.visibility ?? 1 };
}

function solveLeg(
  hx: number,
  hy: number,
  hz: number,
  kx: number,
  ky: number,
  kz: number,
  ax: number,
  ay: number,
  az: number,
  mirror: number
): LegTrackingState {
  const mx = mirror;
  const lift = clamp((hy - ky) * 2.8, -0.25, 1.3);
  const forward = clamp((kx - hx) * mx * 2.2, -1, 1);
  const kneeBend = jointBend(hx, hy, kx, ky, ax, ay);
  const ankleTilt = Math.atan2(ay - ky, (ax - kx) * mx) * 0.35;

  return {
    upper: { x: forward * 0.42, y: 0, z: lift * 0.75 },
    lower: { x: 0, y: 0, z: -clamp(kneeBend, 0, 2.6) * 0.68 },
    foot: { x: ankleTilt, y: 0, z: -hz * 0.15 - kz * 0.1 },
  };
}

function solvePelvis(
  lh: { x: number; y: number; z: number },
  rh: { x: number; y: number; z: number },
  ls: { x: number; y: number },
  rs: { x: number; y: number }
): PelvisTrackingState {
  const hipMidX = (lh.x + rh.x) / 2;
  const hipMidY = (lh.y + rh.y) / 2;
  const hipWidth = Math.abs(rh.x - lh.x) || 0.1;
  const torsoMidX = (ls.x + rs.x) / 2;

  return {
    rotationY: clamp((rh.x - lh.x) * 2.5, -0.45, 0.45),
    shiftX: clamp((0.5 - hipMidX) * 0.12, -0.06, 0.06),
    shiftY: clamp((0.58 - hipMidY) * 0.1, -0.05, 0.05),
    shiftZ: clamp(((lh.z + rh.z) / 2) * 0.15, -0.04, 0.04),
    leanX: clamp((torsoMidX - hipMidX) / hipWidth, -0.35, 0.35),
  };
}

const EMPTY: BodyTrackingState = {
  detected: false,
  leftArm: null,
  rightArm: null,
  leftShoulderRaise: 0,
  rightShoulderRaise: 0,
  pelvis: null,
  leftLeg: null,
  rightLeg: null,
};

export function extractBodyPose(
  result: PoseLandmarkerResult | undefined,
  smoother: TrackingSmoother,
  dt: number
): BodyTrackingState {
  if (!result?.landmarks?.[0]) return EMPTY;

  const ls = pt(result, LM.LEFT_SHOULDER);
  const rs = pt(result, LM.RIGHT_SHOULDER);
  const le = pt(result, LM.LEFT_ELBOW);
  const re = pt(result, LM.RIGHT_ELBOW);
  const lw = pt(result, LM.LEFT_WRIST);
  const rw = pt(result, LM.RIGHT_WRIST);
  const lh = pt(result, LM.LEFT_HIP);
  const rh = pt(result, LM.RIGHT_HIP);
  const lk = pt(result, LM.LEFT_KNEE);
  const rk = pt(result, LM.RIGHT_KNEE);
  const la = pt(result, LM.LEFT_ANKLE);
  const ra = pt(result, LM.RIGHT_ANKLE);

  if (!ls || !rs || ls.v < 0.5 || rs.v < 0.5) return EMPTY;

  const leftArm =
    le && lw && le.v > 0.4 && lw.v > 0.4
      ? (() => {
          const wt = wristTargetFromLandmarks(lw.x, lw.y, lw.z, -1);
          const pole = (le.x - ls.x) * -2.8;
          return {
            ...solveArmIk(ls.x, ls.y, ls.z, le.x, le.y, le.z, lw.x, lw.y, lw.z, -1),
            wristTarget: { x: wt.x, y: wt.y, z: wt.z },
            elbowPoleZ: pole,
          };
        })()
      : null;
  const rightArm =
    re && rw && re.v > 0.4 && rw.v > 0.4
      ? (() => {
          const wt = wristTargetFromLandmarks(rw.x, rw.y, rw.z, 1);
          const pole = (re.x - rs.x) * 2.8;
          return {
            ...solveArmIk(rs.x, rs.y, rs.z, re.x, re.y, re.z, rw.x, rw.y, rw.z, 1),
            wristTarget: { x: wt.x, y: wt.y, z: wt.z },
            elbowPoleZ: pole,
          };
        })()
      : null;

  const hipY = lh && rh ? (lh.y + rh.y) / 2 : 0.7;
  const leftShrug = lh ? clamp((hipY - ls.y) * 4 - 0.5, 0, 1) : 0;
  const rightShrug = rh ? clamp((hipY - rs.y) * 4 - 0.5, 0, 1) : 0;

  const pelvis = lh && rh && lh.v > 0.45 && rh.v > 0.45 ? solvePelvis(lh, rh, ls, rs) : null;

  const leftLeg =
    lh && lk && la && lk.v > 0.4 && la.v > 0.35
      ? solveLeg(lh.x, lh.y, lh.z, lk.x, lk.y, lk.z, la.x, la.y, la.z, -1)
      : null;
  const rightLeg =
    rh && rk && ra && rk.v > 0.4 && ra.v > 0.35
      ? solveLeg(rh.x, rh.y, rh.z, rk.x, rk.y, rk.z, ra.x, ra.y, ra.z, 1)
      : null;

  return smoother.smoothBody(
    {
      detected: !!(leftArm || rightArm || pelvis || leftLeg || rightLeg),
      leftArm,
      rightArm,
      leftShoulderRaise: leftShrug,
      rightShoulderRaise: rightShrug,
      pelvis,
      leftLeg,
      rightLeg,
    },
    dt
  );
}
