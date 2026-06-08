import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  FACE_OVAL_INDICES,
  getFaceFilterPreset,
  type FaceFilterId,
} from "@/lib/face-filters/presets";
import { drawFaceMask3d } from "@/lib/face-filters/mesh-warp";
import { drawPremiumArOverlay } from "@/lib/face-filters/ar/index";

type NormPoint = { x: number; y: number };

function lm(
  result: FaceLandmarkerResult | undefined,
  index: number,
  w: number,
  h: number,
  mirrored: boolean
): NormPoint | null {
  const face = result?.faceLandmarks?.[0];
  if (!face?.[index]) return null;
  const x = mirrored ? (1 - face[index].x) * w : face[index].x * w;
  return { x, y: face[index].y * h };
}

function polygonPath(ctx: CanvasRenderingContext2D, points: NormPoint[]) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function drawFaceBeauty(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  strength: number,
  mirrored: boolean
) {
  if (strength <= 0 || !result?.faceLandmarks?.[0]) return;
  const pts = FACE_OVAL_INDICES.map((i) => lm(result, i, w, h, mirrored)).filter(Boolean) as NormPoint[];
  if (pts.length < 8) return;

  const blurPx = 2 + strength * 10;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  if (!offCtx) return;

  offCtx.save();
  if (mirrored) {
    offCtx.translate(w, 0);
    offCtx.scale(-1, 1);
  }
  offCtx.drawImage(source, 0, 0, w, h);
  offCtx.restore();
  ctx.save();
  polygonPath(ctx, pts);
  ctx.clip();
  ctx.filter = `blur(${blurPx}px) saturate(1.12) brightness(1.04)`;
  ctx.drawImage(off, 0, 0, w, h);
  ctx.filter = "none";
  ctx.globalAlpha = 0.55 + strength * 0.25;
  ctx.drawImage(off, 0, 0, w, h);
  ctx.restore();
}

function drawBlush(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  amount: number,
  mirrored: boolean
) {
  const left = lm(result, 234, w, h, mirrored);
  const right = lm(result, 454, w, h, mirrored);
  if (!left || !right) return;
  const r = w * 0.07;
  ctx.save();
  const grad = (cx: number, cy: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255, 120, 140, ${0.35 * amount})`);
    g.addColorStop(1, "rgba(255, 120, 140, 0)");
    return g;
  };
  ctx.fillStyle = grad(left.x, left.y);
  ctx.beginPath();
  ctx.arc(left.x, left.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grad(right.x, right.y);
  ctx.beginPath();
  ctx.arc(right.x, right.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  filterId: FaceFilterId,
  tick: number,
  mirrored: boolean
) {
  const preset = getFaceFilterPreset(filterId);
  const overlay = preset.overlay;
  if (!overlay || !result?.faceLandmarks?.[0]) return;
  drawPremiumArOverlay(ctx, result, w, h, overlay, tick, mirrored);
}

/** 필터 적용된 프레임을 canvas에 그림 */
export function renderFilteredFrame(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLCanvasElement,
  w: number,
  h: number,
  filterId: FaceFilterId,
  landmarkerResult: FaceLandmarkerResult | undefined,
  tick: number,
  mirrored = true
) {
  const preset = getFaceFilterPreset(filterId);

  ctx.save();
  ctx.filter = preset.colorFilter === "none" ? "none" : preset.colorFilter;
  if (mirrored) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, w, h);
  ctx.restore();

  if (filterId === "none") return;

  drawFaceBeauty(ctx, source, landmarkerResult, w, h, preset.beauty, mirrored);
  if (preset.blush) drawBlush(ctx, landmarkerResult, w, h, preset.blush, mirrored);

  if (preset.mask3d && landmarkerResult) {
    drawFaceMask3d(ctx, landmarkerResult, w, h, preset.mask3d, tick, mirrored);
  } else if (landmarkerResult) {
    drawOverlay(ctx, landmarkerResult, w, h, filterId, tick, mirrored);
  }
}
