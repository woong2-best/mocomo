import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint } from "@/lib/face-filters/ar/geometry";
import { drawSoftBlush } from "@/lib/face-filters/ar/canvas-utils";
import { drawFaceGlitterMask } from "@/lib/face-filters/ar/glitter-mask";

const BROWN = "#8B5E3C";
const DARK = "#5C3D28";
const NOSE = "#2B2B2B";

function drawBrownEar(
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

  const outer = ctx.createLinearGradient(0, -earH * 0.4, 0, earH * 0.55);
  outer.addColorStop(0, "#A67C52");
  outer.addColorStop(0.5, BROWN);
  outer.addColorStop(1, DARK);
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(-earW * 0.12, -earH * 0.05);
  ctx.bezierCurveTo(-earW * 0.62, -earH * 0.12, -earW * 0.72, earH * 0.52, -earW * 0.32, earH * 0.92);
  ctx.bezierCurveTo(-earW * 0.04, earH * 0.72, earW * 0.06, earH * 0.18, -earW * 0.12, -earH * 0.05);
  ctx.fill();

  const inner = ctx.createLinearGradient(0, 0, 0, earH * 0.65);
  inner.addColorStop(0, "#C8956C");
  inner.addColorStop(1, "#8B6914");
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.ellipse(-earW * 0.26, earH * 0.32, earW * 0.2, earH * 0.35, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Glitter Mask Dog — 갈색 귀 + 전면 글리터 */
export function drawGlitterDogOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const sway = Math.sin(face.tick * 0.0048) * 0.13;
  const earW = face.faceW * 0.42;
  const earH = face.scale * 1.05;

  drawBrownEar(ctx, face.leftTemple.x - earW * 0.12, face.forehead.y - earH * 0.32, earW, earH, false, sway - 0.14);
  drawBrownEar(ctx, face.rightTemple.x + earW * 0.12, face.forehead.y - earH * 0.32, earW, earH, true, -sway + 0.14);

  const nw = face.scale * 0.26;
  ctx.save();
  ctx.fillStyle = NOSE;
  ctx.beginPath();
  ctx.ellipse(face.nose.x, face.nose.y + face.scale * 0.06, nw, face.scale * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(face.nose.x - nw * 0.18, face.nose.y + face.scale * 0.04, face.scale * 0.035, face.scale * 0.025, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSoftBlush(ctx, cheekPoint(face, "left").x, cheekPoint(face, "left").y, face.scale * 0.42, "#FFB6C1", 0.45);
  drawSoftBlush(ctx, cheekPoint(face, "right").x, cheekPoint(face, "right").y, face.scale * 0.42, "#FFB6C1", 0.45);
  drawFaceGlitterMask(ctx, face.result, face.w, face.h, 0.95, face.tick, "#FFFFFF");
}
