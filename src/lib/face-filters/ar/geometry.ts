import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { FACE_OVAL_INDICES } from "@/lib/face-filters/presets";
import { estimateHeadPose, type HeadPose } from "@/lib/face-filters/head-pose";
import { faceVerticalSpan, landmarkPt, type FacePt } from "@/lib/face-filters/face-coords";

export type Pt = FacePt;

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
  h: number
): Pt | null {
  return landmarkPt(result, index, w, h);
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
  faceH: number
): FaceExpression {
  const jawOpenBlend = readBlend(result, "jawOpen");
  const smileL = readBlend(result, "mouthSmileLeft");
  const smileR = readBlend(result, "mouthSmileRight");
  const blinkL = readBlend(result, "eyeBlinkLeft");
  const blinkR = readBlend(result, "eyeBlinkRight");

  const upper = lm(result, 13, w, h);
  const lower = lm(result, 14, w, h);
  let jawOpen = jawOpenBlend;
  if (upper && lower && faceH > 1) {
    const gap = Math.hypot(lower.x - upper.x, lower.y - upper.y) / faceH;
    jawOpen = Math.max(jawOpen, Math.min(1, gap * 4.2));
  }

  const mouthL = lm(result, 61, w, h);
  const mouthR = lm(result, 291, w, h);
  const nose = lm(result, 1, w, h);
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
  tick: number
): FaceArContext | null {
  const forehead = lm(result, 10, w, h);
  const nose = lm(result, 1, w, h);
  const chin = lm(result, 152, w, h);
  const leftTemple = lm(result, 234, w, h);
  const rightTemple = lm(result, 454, w, h);
  const leftEye = lm(result, 33, w, h);
  const rightEye = lm(result, 263, w, h);
  const mouthLeft = lm(result, 61, w, h);
  const mouthRight = lm(result, 291, w, h);
  const upperLip = lm(result, 13, w, h);
  const lowerLip = lm(result, 14, w, h);

  if (!forehead || !nose || !leftTemple || !rightTemple || !leftEye || !rightEye) return null;

  const faceW = Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y);
  const span = chin ? faceVerticalSpan(forehead, chin) : { top: forehead.y, bottom: forehead.y + faceW * 1.15, height: faceW * 1.15 };
  const faceH = span.height;
  const scale = faceH * 0.55;
  const pose = estimateHeadPose(result, w, h);
  const expr = estimateExpression(result, w, h, faceH);

  return {
    result,
    w,
    h,
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
  return FACE_OVAL_INDICES.map((i) => lm(ctx.result, i, ctx.w, ctx.h)).filter(Boolean) as Pt[];
}

export function eyeCenter(ctx: FaceArContext, side: "left" | "right"): Pt {
  return side === "left" ? ctx.leftEye : ctx.rightEye;
}

export function cheekPoint(ctx: FaceArContext, side: "left" | "right"): Pt {
  const idx = side === "left" ? 205 : 425;
  return lm(ctx.result, idx, ctx.w, ctx.h) ?? ctx[side === "left" ? "leftTemple" : "rightTemple"];
}
