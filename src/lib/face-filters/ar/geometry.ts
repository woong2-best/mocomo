import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { FACE_OVAL_INDICES } from "@/lib/face-filters/presets";
import { estimateHeadPose, type HeadPose } from "@/lib/face-filters/head-pose";

export type Pt = { x: number; y: number };

export type FaceExpression = {
  jawOpen: number;
  smile: number;
  blinkLeft: number;
  blinkRight: number;
};

export type FaceArContext = {
  result: FaceLandmarkerResult;
  w: number;
  h: number;
  mirrored: boolean;
  tick: number;
  faceW: number;
  faceH: number;
  scale: number;
  pose: HeadPose | null;
  expr: FaceExpression;
  forehead: Pt;
  nose: Pt;
  chin: Pt;
  leftTemple: Pt;
  rightTemple: Pt;
  leftEye: Pt;
  rightEye: Pt;
  mouthLeft: Pt;
  mouthRight: Pt;
  upperLip: Pt;
  lowerLip: Pt;
};

export function lm(
  result: FaceLandmarkerResult,
  index: number,
  w: number,
  h: number,
  mirrored: boolean
): Pt | null {
  const p = result.faceLandmarks?.[0]?.[index];
  if (!p) return null;
  return {
    x: mirrored ? (1 - p.x) * w : p.x * w,
    y: p.y * h,
  };
}

function readBlend(result: FaceLandmarkerResult, name: string): number {
  const cats = result.faceBlendshapes?.[0]?.categories;
  if (!cats) return 0;
  const hit = cats.find((c) => c.categoryName === name);
  return hit?.score ?? 0;
}

export function estimateExpression(
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  mirrored: boolean,
  faceH: number
): FaceExpression {
  const jawOpenBlend = readBlend(result, "jawOpen");
  const smileL = readBlend(result, "mouthSmileLeft");
  const smileR = readBlend(result, "mouthSmileRight");
  const blinkL = readBlend(result, "eyeBlinkLeft");
  const blinkR = readBlend(result, "eyeBlinkRight");

  const upper = lm(result, 13, w, h, mirrored);
  const lower = lm(result, 14, w, h, mirrored);
  let jawOpen = jawOpenBlend;
  if (upper && lower && faceH > 1) {
    const gap = Math.hypot(lower.x - upper.x, lower.y - upper.y) / faceH;
    jawOpen = Math.max(jawOpen, Math.min(1, gap * 4.2));
  }

  const mouthL = lm(result, 61, w, h, mirrored);
  const mouthR = lm(result, 291, w, h, mirrored);
  const nose = lm(result, 1, w, h, mirrored);
  let smile = (smileL + smileR) / 2;
  if (mouthL && mouthR && nose) {
    const cornerLift =
      ((nose.y - (mouthL.y + mouthR.y) / 2) / Math.max(1, faceH * 0.12)) * 0.35;
    smile = Math.max(smile, Math.min(1, cornerLift));
  }

  return {
    jawOpen,
    smile,
    blinkLeft: blinkL,
    blinkRight: blinkR,
  };
}

export function buildFaceArContext(
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  tick: number,
  mirrored: boolean
): FaceArContext | null {
  const forehead = lm(result, 10, w, h, mirrored);
  const nose = lm(result, 1, w, h, mirrored);
  const chin = lm(result, 152, w, h, mirrored);
  const leftTemple = lm(result, 234, w, h, mirrored);
  const rightTemple = lm(result, 454, w, h, mirrored);
  const leftEye = lm(result, 33, w, h, mirrored);
  const rightEye = lm(result, 263, w, h, mirrored);
  const mouthLeft = lm(result, 61, w, h, mirrored);
  const mouthRight = lm(result, 291, w, h, mirrored);
  const upperLip = lm(result, 13, w, h, mirrored);
  const lowerLip = lm(result, 14, w, h, mirrored);

  if (!forehead || !nose || !leftTemple || !rightTemple || !leftEye || !rightEye) return null;

  const faceW = Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y);
  const faceH = chin ? Math.abs(chin.y - forehead.y) : faceW * 1.15;
  const scale = faceH * 0.55;
  const pose = estimateHeadPose(result, w, h, mirrored);
  const expr = estimateExpression(result, w, h, mirrored, faceH);

  return {
    result,
    w,
    h,
    mirrored,
    tick,
    faceW,
    faceH,
    scale,
    pose,
    expr,
    forehead,
    nose,
    chin: chin ?? { x: nose.x, y: nose.y + faceH * 0.55 },
    leftTemple,
    rightTemple,
    leftEye,
    rightEye,
    mouthLeft: mouthLeft ?? { x: nose.x - faceW * 0.12, y: nose.y + faceH * 0.08 },
    mouthRight: mouthRight ?? { x: nose.x + faceW * 0.12, y: nose.y + faceH * 0.08 },
    upperLip: upperLip ?? { x: nose.x, y: nose.y + faceH * 0.06 },
    lowerLip: lowerLip ?? { x: nose.x, y: nose.y + faceH * 0.1 },
  };
}

export function faceOvalPoints(ctx: FaceArContext): Pt[] {
  return FACE_OVAL_INDICES.map((i) => lm(ctx.result, i, ctx.w, ctx.h, ctx.mirrored)).filter(
    Boolean
  ) as Pt[];
}

export function eyeCenter(ctx: FaceArContext, side: "left" | "right"): Pt {
  return side === "left" ? ctx.leftEye : ctx.rightEye;
}

export function cheekPoint(ctx: FaceArContext, side: "left" | "right"): Pt {
  const idx = side === "left" ? 205 : 425;
  return lm(ctx.result, idx, ctx.w, ctx.h, ctx.mirrored) ?? ctx[side === "left" ? "leftTemple" : "rightTemple"];
}
