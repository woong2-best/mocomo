import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint, faceOvalPoints } from "@/lib/face-filters/ar/geometry";
import { drawPhiltrumY } from "@/lib/face-filters/ar/canvas-utils";

const WHITE_FUR = "#FAFAFA";
const INNER_EAR = "#FFCCD5";

function drawRabbitEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  width: number,
  flip: boolean,
  sway: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  if (flip) ctx.scale(-1, 1);

  const topW = width * 0.42;
  const tipW = width * 0.28;

  ctx.fillStyle = WHITE_FUR;
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(-topW * 0.5, height * 0.08);
  ctx.bezierCurveTo(-topW * 0.55, height * 0.45, -tipW * 0.45, height * 0.92, -tipW * 0.35, height);
  ctx.bezierCurveTo(-tipW * 0.1, height * 0.88, tipW * 0.1, height * 0.88, tipW * 0.35, height);
  ctx.bezierCurveTo(tipW * 0.45, height * 0.92, topW * 0.55, height * 0.45, topW * 0.5, height * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = INNER_EAR;
  ctx.beginPath();
  ctx.moveTo(-topW * 0.28, height * 0.15);
  ctx.bezierCurveTo(-topW * 0.3, height * 0.5, -tipW * 0.22, height * 0.88, -tipW * 0.15, height * 0.92);
  ctx.bezierCurveTo(0, height * 0.9, tipW * 0.15, height * 0.92, tipW * 0.22, height * 0.88);
  ctx.bezierCurveTo(topW * 0.3, height * 0.5, topW * 0.28, height * 0.15, 0, height * 0.12);
  ctx.fill();

  ctx.strokeStyle = `rgba(232,143,160,${0.35})`;
  ctx.lineWidth = 0.6;
  const veins = [
    [0, height * 0.2, -topW * 0.12, height * 0.45, -tipW * 0.08, height * 0.75],
    [0, height * 0.22, topW * 0.1, height * 0.5, tipW * 0.06, height * 0.78],
    [-topW * 0.05, height * 0.35, -topW * 0.18, height * 0.55, -tipW * 0.12, height * 0.82],
  ];
  for (const [mx, my, bx, by, ex, ey] of veins) {
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(bx, by, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCheekFluff(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, tick: number) {
  const breath = 1 + Math.sin(tick * 0.0035) * 0.06;
  ctx.save();
  ctx.filter = "blur(4px)";
  ctx.fillStyle = "rgba(250,250,250,0.75)";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI - Math.PI / 2;
    const r = scale * 0.25 * breath;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, scale * 0.08, scale * 0.14, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEyeFurFrame(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = scale * 0.12;
  ctx.filter = "blur(2px)";
  ctx.beginPath();
  ctx.ellipse(x, y, scale * 0.22, scale * 0.14, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBuckTeeth(face: FaceArContext, ctx: CanvasRenderingContext2D) {
  if (face.expr.smile < 0.35) return;
  const cx = (face.mouthLeft.x + face.mouthRight.x) / 2;
  const cy = face.upperLip.y + face.scale * 0.06;
  const tw = face.scale * 0.07;
  const th = face.scale * 0.12 * face.expr.smile;

  ctx.save();
  ctx.fillStyle = "#FFFFF0";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * tw * 0.15, cy);
    ctx.lineTo(cx + side * tw * 0.55, cy);
    ctx.lineTo(cx + side * tw * 0.45, cy + th);
    ctx.lineTo(cx + side * tw * 0.05, cy + th);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(200,200,180,0.4)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + th);
  ctx.stroke();
  ctx.restore();
}

/** Angora rabbit AR — SOFT · FLUFFY */
export function drawBunnyOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const earH = Math.min(face.scale * 2.2, face.h * 0.22);
  const earW = earH * 0.32;
  const swayL = Math.sin(face.tick * 0.0035) * 0.09;
  const swayR = Math.sin(face.tick * 0.0035 + Math.PI * 0.7) * 0.09;

  drawRabbitEar(ctx, face.leftTemple.x, face.forehead.y - earH * 0.55, earH, earW, false, swayL);
  drawRabbitEar(ctx, face.rightTemple.x, face.forehead.y - earH * 0.55, earH, earW, true, swayR);

  drawCheekFluff(ctx, cheekPoint(face, "left").x, cheekPoint(face, "left").y, face.scale, face.tick);
  drawCheekFluff(ctx, cheekPoint(face, "right").x, cheekPoint(face, "right").y, face.scale, face.tick);

  drawEyeFurFrame(ctx, face.leftEye.x, face.leftEye.y, face.scale);
  drawEyeFurFrame(ctx, face.rightEye.x, face.rightEye.y, face.scale);

  const noseW = face.scale * 0.11;
  const noseH = face.scale * 0.08;
  const sniff = Math.sin(face.tick * 0.021) * face.scale * 0.008;
  ctx.fillStyle = "#FFB6C1";
  ctx.beginPath();
  ctx.moveTo(face.nose.x, face.nose.y + noseH * 0.35 + sniff);
  ctx.lineTo(face.nose.x - noseW * 0.45, face.nose.y - noseH * 0.15 + sniff);
  ctx.lineTo(face.nose.x + noseW * 0.45, face.nose.y - noseH * 0.15 + sniff);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(face.nose.x, face.nose.y - noseH * 0.08 + sniff, face.scale * 0.01, 0, Math.PI * 2);
  ctx.fill();
  drawPhiltrumY(ctx, face.nose, face.scale, "rgba(255,182,193,0.65)", 0.65);

  drawFurTint(ctx, face);
  drawBuckTeeth(face, ctx);
}

function drawFurTint(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const pts = faceOvalPoints(face);
  if (pts.length < 8) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(250,250,250,0.08)";
  ctx.fillRect(0, 0, face.w, face.h);
  ctx.restore();
}
