import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint, eyeCenter } from "@/lib/face-filters/ar/geometry";
import { drawIrregularPatch, drawSoftBlush } from "@/lib/face-filters/ar/canvas-utils";
import { drawFaceGlitterMask } from "@/lib/face-filters/ar/glitter-mask";

const WHITE = "#F5F5F5";
const SPOT = "#1A1A1A";
const NOSE = "#2B2B2B";

function drawDalmatianEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  earW: number,
  earH: number,
  flip: boolean,
  sway: number,
  tick: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  if (flip) ctx.scale(-1, 1);

  const g = ctx.createLinearGradient(0, -earH * 0.4, 0, earH * 0.6);
  g.addColorStop(0, "#FFFFFF");
  g.addColorStop(0.5, WHITE);
  g.addColorStop(1, "#E8E8E8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-earW * 0.1, -earH * 0.05);
  ctx.bezierCurveTo(-earW * 0.6, -earH * 0.1, -earW * 0.75, earH * 0.55, -earW * 0.3, earH * 0.95);
  ctx.bezierCurveTo(-earW * 0.05, earH * 0.75, earW * 0.05, earH * 0.15, -earW * 0.1, -earH * 0.05);
  ctx.fill();

  for (let s = 0; s < 4; s++) {
    const sx = -earW * (0.25 + s * 0.12) + Math.sin(tick * 0.002 + s) * 2;
    const sy = earH * (0.25 + s * 0.15);
    drawIrregularPatch(ctx, sx, sy, earW * 0.08, earH * 0.07, SPOT, 0.85, s + 1);
  }

  ctx.restore();
}

function drawDalmatianNose(ctx: CanvasRenderingContext2D, nose: { x: number; y: number }, s: number) {
  const nw = s * 0.28;
  const nh = s * 0.2;
  ctx.save();
  ctx.fillStyle = NOSE;
  ctx.beginPath();
  ctx.ellipse(nose.x, nose.y + s * 0.06, nw, nh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(nose.x - nw * 0.2, nose.y + s * 0.04, s * 0.035, s * 0.025, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** DÁLMATA — 달마시안 귀·코 + 글리터 */
export function drawDalmatianOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const sway = Math.sin(face.tick * 0.005) * 0.12;
  const earW = face.faceW * 0.38;
  const earH = face.scale * 1.0;

  drawDalmatianEar(ctx, face.leftTemple.x - earW * 0.1, face.forehead.y - earH * 0.3, earW, earH, false, sway - 0.1, face.tick);
  drawDalmatianEar(ctx, face.rightTemple.x + earW * 0.1, face.forehead.y - earH * 0.3, earW, earH, true, -sway + 0.1, face.tick);

  for (const side of ["left", "right"] as const) {
    const eye = eyeCenter(face, side);
    drawIrregularPatch(ctx, eye.x, eye.y + face.scale * 0.1, face.faceW * 0.1, face.scale * 0.08, SPOT, 0.55, side === "left" ? 1 : 2);
  }

  drawSoftBlush(ctx, cheekPoint(face, "left").x, cheekPoint(face, "left").y, face.scale * 0.4, "#FFB6C1", 0.4);
  drawSoftBlush(ctx, cheekPoint(face, "right").x, cheekPoint(face, "right").y, face.scale * 0.4, "#FFB6C1", 0.4);
  drawDalmatianNose(ctx, face.nose, face.scale);
  drawFaceGlitterMask(ctx, face.result, face.w, face.h, 0.85, face.tick, "#FFFFFF");
}
