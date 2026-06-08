import type { ArmTrackingState } from "@/lib/virtual-avatar/tracking/types";

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

/** 2-bone IK — 어깨·팔꿈치·손목 랜드마크 → VRM 팔 회전 */
export function solveArmIk(
  sx: number,
  sy: number,
  sz: number,
  ex: number,
  ey: number,
  ez: number,
  wx: number,
  wy: number,
  wz: number,
  mirror: number
): ArmTrackingState {
  const mx = mirror;
  const shoulder = { x: (0.5 - sx) * mx, y: (0.5 - sy), z: -sz * 2 };
  const elbow = { x: (0.5 - ex) * mx, y: (0.5 - ey), z: -ez * 2 };
  const wrist = { x: (0.5 - wx) * mx, y: (0.5 - wy), z: -wz * 2 };

  const udx = elbow.x - shoulder.x;
  const udy = elbow.y - shoulder.y;
  const udz = elbow.z - shoulder.z;
  const ul = Math.hypot(udx, udy, udz) || 1;

  const ldx = wrist.x - elbow.x;
  const ldy = wrist.y - elbow.y;
  const ldz = wrist.z - elbow.z;

  const upperX = clamp(-Math.asin(clamp(udz / ul, -1, 1)), -1.4, 1.4);
  const upperY = Math.atan2(udx, -udy + 0.001);
  const upperZ = -clamp((shoulder.y - elbow.y) * 2.8, -0.2, 1.7) - 0.12;

  const elbowBend = jointBend(shoulder.x, shoulder.y, elbow.x, elbow.y, wrist.x, wrist.y);
  const wristTwist = Math.atan2(ldy, ldx) * 0.25;

  return {
    upper: { x: upperX * 0.85, y: upperY * 0.55, z: upperZ * 0.9 },
    lower: { x: 0, y: 0, z: -clamp(elbowBend, 0, 2.6) * 0.62 },
    hand: { x: wristTwist * 0.3, y: 0, z: wristTwist * 0.15 },
  };
}
