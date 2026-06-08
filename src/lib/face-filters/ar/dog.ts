import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint, eyeCenter, faceOvalPoints } from "@/lib/face-filters/ar/geometry";
import {
  drawFurGrainOverlay,
  drawIrregularPatch,
  drawSoftBlush,
} from "@/lib/face-filters/ar/canvas-utils";

const WARM_FUR = "#C8956C";
const DARK_PATCH = "#8B4513";
const NOSE_COLOR = "#2B2B2B";
const BLUSH = "#FFB6C1";
const INNER_EAR = ["#FFB3BA", "#FF8FA0"];

function drawFloppyEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  earW: number,
  earH: number,
  flip: boolean,
  sway: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  if (flip) ctx.scale(-1, 1);

  for (let layer = 0; layer < 3; layer++) {
    const spread = 1 + layer * 0.08;
    ctx.save();
    ctx.filter = layer === 2 ? "blur(8px)" : "none";
    ctx.globalAlpha = layer === 0 ? 1 : 0.55 - layer * 0.12;

    const outer = ctx.createLinearGradient(0, -earH * 0.5, 0, earH * 0.55);
    outer.addColorStop(0, "#A67C52");
    outer.addColorStop(0.45, WARM_FUR);
    outer.addColorStop(1, "#8B6914");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(-earW * 0.15 * spread, -earH * 0.05);
    ctx.bezierCurveTo(-earW * 0.65 * spread, -earH * 0.15, -earW * 0.75 * spread, earH * 0.55, -earW * 0.35 * spread, earH * 0.95);
    ctx.bezierCurveTo(-earW * 0.05 * spread, earH * 0.75, earW * 0.08 * spread, earH * 0.2, -earW * 0.15 * spread, -earH * 0.05);
    ctx.fill();

    const inner = ctx.createLinearGradient(0, 0, 0, earH * 0.7);
    inner.addColorStop(0, INNER_EAR[0]);
    inner.addColorStop(1, INNER_EAR[1]);
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.ellipse(-earW * 0.28 * spread, earH * 0.35, earW * 0.22, earH * 0.38, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDogNose(ctx: CanvasRenderingContext2D, nose: { x: number; y: number }, s: number, tick: number) {
  const nw = s * 0.26;
  const nh = s * 0.18;
  const pulse = 0.85 + 0.15 * Math.sin(tick * 0.00785);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 1.5;
  ctx.fillStyle = NOSE_COLOR;
  ctx.beginPath();
  ctx.ellipse(nose.x, nose.y + s * 0.06, nw, nh, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,255,255,${0.55 * pulse})`;
  ctx.beginPath();
  ctx.ellipse(nose.x - nw * 0.18, nose.y + s * 0.04, s * 0.04, s * 0.03, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${0.35 * pulse})`;
  ctx.beginPath();
  ctx.arc(nose.x + nw * 0.12, nose.y + s * 0.08, s * 0.018, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEyePatches(face: FaceArContext, ctx: CanvasRenderingContext2D) {
  const patchR = face.faceW * 0.11;
  for (const side of ["left", "right"] as const) {
    const eye = eyeCenter(face, side);
    drawIrregularPatch(
      ctx,
      eye.x,
      eye.y + face.scale * 0.12,
      patchR * 1.1,
      patchR * 0.75,
      DARK_PATCH,
      0.4,
      side === "left" ? 1.2 : 2.4
    );
  }
}

function drawTongue(face: FaceArContext, ctx: CanvasRenderingContext2D) {
  if (face.expr.jawOpen < 0.22) return;
  const { mouthLeft, mouthRight, lowerLip } = face;
  const mouthW = Math.hypot(mouthRight.x - mouthLeft.x, mouthRight.y - mouthLeft.y);
  const tw = mouthW * 0.55;
  const th = face.scale * 0.22 * face.expr.jawOpen;
  const tx = (mouthLeft.x + mouthRight.x) / 2;
  const ty = lowerLip.y + th * 0.15;

  ctx.save();
  ctx.fillStyle = "#FF7096";
  ctx.beginPath();
  ctx.moveTo(tx - tw * 0.45, ty);
  ctx.bezierCurveTo(tx - tw * 0.5, ty + th, tx, ty + th * 1.15, tx, ty + th * 0.95);
  ctx.bezierCurveTo(tx, ty + th * 1.15, tx + tw * 0.5, ty + th, tx + tw * 0.45, ty);
  ctx.bezierCurveTo(tx + tw * 0.15, ty - th * 0.15, tx - tw * 0.15, ty - th * 0.15, tx - tw * 0.45, ty);
  ctx.fill();

  ctx.strokeStyle = "rgba(180,40,80,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx, ty + th * 0.15);
  ctx.lineTo(tx, ty + th * 0.85);
  ctx.stroke();
  ctx.restore();
}

/** Cocker spaniel AR — WARM · FLUFFY */
export function drawDogOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const sway = Math.sin(face.tick * 0.00524) * 0.14;
  const earW = face.faceW * 0.4;
  const earH = face.scale * 1.05;

  drawFloppyEar(ctx, face.leftTemple.x - earW * 0.15, face.forehead.y - earH * 0.35, earW, earH, false, sway - 0.12);
  drawFloppyEar(ctx, face.rightTemple.x + earW * 0.15, face.forehead.y - earH * 0.35, earW, earH, true, -sway + 0.12);

  drawFurGrainOverlay(ctx, faceOvalPoints(face), face.w, face.h, WARM_FUR, 0.18, 0.8, face.tick);
  drawEyePatches(face, ctx);

  const blushR = face.scale * 0.45;
  drawSoftBlush(ctx, cheekPoint(face, "left").x, cheekPoint(face, "left").y, blushR, BLUSH, 0.55);
  drawSoftBlush(ctx, cheekPoint(face, "right").x, cheekPoint(face, "right").y, blushR, BLUSH, 0.55);

  drawDogNose(ctx, face.nose, face.scale, face.tick);
  drawTongue(face, ctx);
}
