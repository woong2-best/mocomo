import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  FACE_OVAL_INDICES,
  getFaceFilterPreset,
  type FaceFilterId,
} from "@/lib/face-filters/presets";
import { drawFaceMask3d } from "@/lib/face-filters/mesh-warp";
import { drawPremiumArOverlay } from "@/lib/face-filters/ar/index";
import { landmarkPt } from "@/lib/face-filters/face-coords";

type NormPoint = { x: number; y: number };

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
  strength: number
) {
  if (strength <= 0 || !result?.faceLandmarks?.[0]) return;
  const pts = FACE_OVAL_INDICES.map((i) => landmarkPt(result, i, w, h)).filter(Boolean) as NormPoint[];
  if (pts.length < 8) return;

  const blurPx = 2 + strength * 10;
  ctx.save();
  polygonPath(ctx, pts);
  ctx.clip();
  ctx.filter = `blur(${blurPx}px) saturate(1.12) brightness(1.04)`;
  ctx.drawImage(source, 0, 0, w, h);
  ctx.filter = "none";
  ctx.globalAlpha = 0.55 + strength * 0.25;
  ctx.drawImage(source, 0, 0, w, h);
  ctx.restore();
}

function drawBlush(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  amount: number
) {
  const left = landmarkPt(result, 234, w, h);
  const right = landmarkPt(result, 454, w, h);
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
  if (mirrored) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  ctx.filter = preset.colorFilter === "none" ? "none" : preset.colorFilter;
  ctx.drawImage(source, 0, 0, w, h);
  ctx.filter = "none";

  if (filterId !== "none" && landmarkerResult) {
    drawFaceBeauty(ctx, source, landmarkerResult, w, h, preset.beauty);
    if (preset.blush) drawBlush(ctx, landmarkerResult, w, h, preset.blush);

    if (preset.mask3d) {
      drawFaceMask3d(ctx, landmarkerResult, w, h, preset.mask3d, tick);
    } else if (preset.overlay) {
      drawPremiumArOverlay(ctx, landmarkerResult, w, h, preset.overlay, tick);
    }
  }

  ctx.restore();
}
