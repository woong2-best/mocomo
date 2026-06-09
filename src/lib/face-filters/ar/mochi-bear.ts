import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint } from "@/lib/face-filters/ar/geometry";
import { drawSoftBlush } from "@/lib/face-filters/ar/canvas-utils";
import { drawFaceGlitterMask } from "@/lib/face-filters/ar/glitter-mask";

const BEAR = "#2B2B2B";

function drawRoundBearEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  flip: boolean,
  sway: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  if (flip) ctx.scale(-1, 1);

  ctx.fillStyle = BEAR;
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.1, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4A4A4A";
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.15, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 모찌 곰 글리터 — 둥근 귀 + 밀도 높은 글리터 */
export function drawMochiBearOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const sway = Math.sin(face.tick * 0.004) * 0.08;
  const earR = face.scale * 0.38;

  drawRoundBearEar(ctx, face.leftTemple.x, face.forehead.y - earR * 0.5, earR, false, sway - 0.06);
  drawRoundBearEar(ctx, face.rightTemple.x, face.forehead.y - earR * 0.5, earR, true, -sway + 0.06);

  const noseR = face.scale * 0.055;
  ctx.save();
  ctx.fillStyle = BEAR;
  ctx.beginPath();
  ctx.arc(face.nose.x, face.nose.y + face.scale * 0.04, noseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSoftBlush(ctx, cheekPoint(face, "left").x, cheekPoint(face, "left").y, face.scale * 0.45, "#FFB6C1", 0.5);
  drawSoftBlush(ctx, cheekPoint(face, "right").x, cheekPoint(face, "right").y, face.scale * 0.45, "#FFB6C1", 0.5);
  drawFaceGlitterMask(ctx, face.result, face.w, face.h, 1, face.tick, "#FFFFFF");
}
