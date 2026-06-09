import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  FACE_OVAL_INDICES,
  LEFT_EYE_INDICES,
  RIGHT_EYE_INDICES,
} from "@/lib/face-filters/presets";
import { landmarkPt } from "@/lib/face-filters/face-coords";

type NormPoint = { x: number; y: number };

export type BeautyProOptions = {
  smooth: number;
  glow: number;
  blush?: number;
  eyeBright?: number;
  lipTint?: number;
  lipColor?: string;
};

const LIP_INDICES = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
] as const;

let offscreen: HTMLCanvasElement | null = null;
let offCtx: CanvasRenderingContext2D | null = null;

function getOffscreen(w: number, h: number) {
  if (!offscreen) {
    offscreen = document.createElement("canvas");
    offCtx = offscreen.getContext("2d", { alpha: false });
    if (!offCtx) throw new Error("Canvas 2D not supported");
  }
  if (offscreen.width !== w) offscreen.width = w;
  if (offscreen.height !== h) offscreen.height = h;
  return { canvas: offscreen, ctx: offCtx };
}

function polygonPath(ctx: CanvasRenderingContext2D, points: NormPoint[]) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function ovalPoints(result: FaceLandmarkerResult, w: number, h: number): NormPoint[] {
  return FACE_OVAL_INDICES.map((i) => landmarkPt(result, i, w, h)).filter(Boolean) as NormPoint[];
}

function drawPremiumSkinSmooth(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  strength: number
) {
  const pts = ovalPoints(result, w, h);
  if (pts.length < 8 || strength <= 0) return;

  const { ctx: off } = getOffscreen(w, h);
  if (!off) return;
  const blurA = 3 + strength * 8;
  const blurB = 8 + strength * 14;

  off.clearRect(0, 0, w, h);
  off.drawImage(source, 0, 0, w, h);
  off.save();
  polygonPath(off, pts);
  off.clip();
  off.filter = `blur(${blurA}px) saturate(1.08) brightness(1.03)`;
  off.drawImage(source, 0, 0, w, h);
  off.filter = "none";
  off.globalAlpha = 0.72 + strength * 0.18;
  off.drawImage(source, 0, 0, w, h);
  off.restore();

  off.save();
  polygonPath(off, pts);
  off.clip();
  off.filter = `blur(${blurB}px) brightness(1.05)`;
  off.globalAlpha = 0.35 + strength * 0.25;
  off.drawImage(source, 0, 0, w, h);
  off.filter = "none";
  off.restore();

  ctx.save();
  polygonPath(ctx, pts);
  ctx.clip();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.58 + strength * 0.28;
  ctx.drawImage(offscreen!, 0, 0, w, h);
  ctx.restore();
}

function drawEyeBrighten(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  amount: number
) {
  if (amount <= 0) return;

  for (const indices of [LEFT_EYE_INDICES, RIGHT_EYE_INDICES]) {
    const pts = indices.map((i) => landmarkPt(result, i, w, h)).filter(Boolean) as NormPoint[];
    if (pts.length < 4) continue;

    let cx = 0;
    let cy = 0;
    for (const p of pts) {
      cx += p.x;
      cy += p.y;
    }
    cx /= pts.length;
    cy /= pts.length;

    const r = w * 0.045;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r * 1.6);
    g.addColorStop(0, `rgba(255,255,255,${0.55 * amount})`);
    g.addColorStop(0.45, `rgba(255,248,240,${0.28 * amount})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawLipTint(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  amount: number,
  color = "#E8506A"
) {
  if (amount <= 0) return;
  const pts = LIP_INDICES.map((i) => landmarkPt(result, i, w, h)).filter(Boolean) as NormPoint[];
  if (pts.length < 6) return;

  const r = parseInt(color.slice(1, 3), 16);
  const gC = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  ctx.save();
  polygonPath(ctx, pts);
  ctx.clip();
  ctx.filter = `blur(${Math.max(2, w * 0.004)}px)`;
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = `rgba(${r},${gC},${b},${0.45 * amount})`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgba(${r},${gC},${b},${0.32 * amount})`;
  ctx.fillRect(0, 0, w, h);
  ctx.filter = "none";
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.25 * amount;
  const upper = landmarkPt(result, 13, w, h);
  if (upper) {
    const gloss = ctx.createRadialGradient(upper.x, upper.y, 0, upper.x, upper.y, w * 0.025);
    gloss.addColorStop(0, "rgba(255,255,255,0.9)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(upper.x, upper.y, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSoftGlow(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  amount: number
) {
  if (amount <= 0) return;
  const pts = ovalPoints(result, w, h);
  if (pts.length < 8) return;

  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  cx /= pts.length;
  cy /= pts.length;

  const r = Math.max(w, h) * 0.38;
  ctx.save();
  polygonPath(ctx, pts);
  ctx.clip();
  ctx.globalCompositeOperation = "soft-light";
  const g = ctx.createRadialGradient(cx, cy - r * 0.15, 0, cx, cy, r);
  g.addColorStop(0, `rgba(255,240,245,${0.55 * amount})`);
  g.addColorStop(0.5, `rgba(255,220,230,${0.22 * amount})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawPremiumBlush(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  amount: number
) {
  const left = landmarkPt(result, 234, w, h);
  const right = landmarkPt(result, 454, w, h);
  if (!left || !right) return;

  for (const pt of [left, right]) {
    const r = w * 0.09;
    ctx.save();
    ctx.filter = `blur(${r * 0.55}px)`;
    ctx.globalCompositeOperation = "multiply";
    const g = ctx.createRadialGradient(pt.x, pt.y + r * 0.1, 0, pt.x, pt.y, r);
    g.addColorStop(0, `rgba(255, 90, 120, ${0.42 * amount})`);
    g.addColorStop(0.55, `rgba(255, 130, 150, ${0.22 * amount})`);
    g.addColorStop(1, "rgba(255, 120, 140, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 인스타급 뷰티 — 다중 패스 스킨·눈·입술·글로우 */
export function drawPremiumBeauty(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  opts: BeautyProOptions
) {
  if (!result?.faceLandmarks?.[0]) return;

  drawPremiumSkinSmooth(ctx, source, result, w, h, opts.smooth);
  drawSoftGlow(ctx, result, w, h, opts.glow);
  if (opts.blush) drawPremiumBlush(ctx, result, w, h, opts.blush);
  if (opts.eyeBright) drawEyeBrighten(ctx, result, w, h, opts.eyeBright);
  if (opts.lipTint) drawLipTint(ctx, result, w, h, opts.lipTint, opts.lipColor);
}
