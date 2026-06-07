import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  FACE_OVAL_INDICES,
  LEFT_EYE_INDICES,
  RIGHT_EYE_INDICES,
  getFaceFilterPreset,
  type FaceFilterId,
} from "@/lib/face-filters/presets";
import { drawFaceMask3d } from "@/lib/face-filters/mesh-warp";

type NormPoint = { x: number; y: number };

function lm(
  result: FaceLandmarkerResult | undefined,
  index: number,
  w: number,
  h: number
): NormPoint | null {
  const face = result?.faceLandmarks?.[0];
  if (!face?.[index]) return null;
  return { x: face[index].x * w, y: face[index].y * h };
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
  strength: number
) {
  if (strength <= 0 || !result?.faceLandmarks?.[0]) return;
  const pts = FACE_OVAL_INDICES.map((i) => lm(result, i, w, h)).filter(Boolean) as NormPoint[];
  if (pts.length < 8) return;

  const blurPx = 2 + strength * 10;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  if (!offCtx) return;

  offCtx.drawImage(source, 0, 0, w, h);
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
  amount: number
) {
  const left = lm(result, 234, w, h);
  const right = lm(result, 454, w, h);
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

function drawEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  flip: boolean,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.45, size * 0.85, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  filterId: FaceFilterId,
  tick: number
) {
  const preset = getFaceFilterPreset(filterId);
  const overlay = preset.overlay;
  if (!overlay || !result?.faceLandmarks?.[0]) return;

  const forehead = lm(result, 10, w, h);
  const nose = lm(result, 1, w, h);
  const chin = lm(result, 152, w, h);
  const leftTemple = lm(result, 234, w, h);
  const rightTemple = lm(result, 454, w, h);
  if (!forehead || !nose) return;

  const faceH = chin ? Math.abs(chin.y - forehead.y) : h * 0.35;
  const scale = faceH * 0.55;

  ctx.save();

  if (overlay === "dog" || overlay === "cat" || overlay === "bunny") {
    const earColor =
      overlay === "dog" ? "#c4a574" : overlay === "cat" ? "#9aa0a6" : "#f5d0e8";
    if (leftTemple) drawEar(ctx, leftTemple.x - scale * 0.35, forehead.y - scale * 0.5, scale, false, earColor);
    if (rightTemple) drawEar(ctx, rightTemple.x + scale * 0.35, forehead.y - scale * 0.5, scale, true, earColor);
    if (overlay === "dog" && nose) {
      ctx.fillStyle = "rgba(30,20,10,0.75)";
      ctx.beginPath();
      ctx.ellipse(nose.x, nose.y + scale * 0.08, scale * 0.18, scale * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (overlay === "cat" && nose) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(nose.x, nose.y);
        ctx.lineTo(nose.x + side * scale * 0.35, nose.y + scale * 0.05);
        ctx.stroke();
      }
    }
  }

  if (overlay === "crown" && forehead) {
    const cx = (leftTemple && rightTemple ? (leftTemple.x + rightTemple.x) / 2 : forehead.x);
    const cy = forehead.y - scale * 0.55;
    ctx.fillStyle = "#ffd54f";
    ctx.strokeStyle = "#f9a825";
    ctx.lineWidth = 2;
    const spikes = 5;
    const rw = scale * 0.9;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = Math.PI + (i / (spikes * 2)) * Math.PI;
      const rr = i % 2 === 0 ? rw : rw * 0.55;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.55;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (overlay === "glasses") {
    const drawLens = (indices: readonly number[]) => {
      const pts = indices.map((i) => lm(result, i, w, h)).filter(Boolean) as NormPoint[];
      if (pts.length < 4) return;
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      const pad = scale * 0.12;
      ctx.strokeStyle = "rgba(20,20,20,0.85)";
      ctx.lineWidth = Math.max(3, scale * 0.06);
      const rw = maxX - minX + pad * 2;
      const rh = maxY - minY + pad * 2;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(minX - pad, minY - pad, rw, rh, scale * 0.08);
      } else {
        ctx.rect(minX - pad, minY - pad, rw, rh);
      }
      ctx.stroke();
    };
    drawLens(LEFT_EYE_INDICES);
    drawLens(RIGHT_EYE_INDICES);
    if (leftTemple && rightTemple) {
      ctx.beginPath();
      ctx.moveTo(leftTemple.x, (leftTemple.y + forehead.y) / 2);
      ctx.lineTo(rightTemple.x, (rightTemple.y + forehead.y) / 2);
      ctx.stroke();
    }
  }

  if (overlay === "hearts") {
    const drawHeart = (x: number, y: number, s: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ff4d8d";
      ctx.font = `${s}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♥", x, y);
      ctx.restore();
    };
    const bounce = Math.sin(tick * 0.008) * scale * 0.08;
    if (leftTemple) drawHeart(leftTemple.x, leftTemple.y - scale * 0.2 + bounce, scale * 0.35, 0.9);
    if (rightTemple) drawHeart(rightTemple.x, rightTemple.y - scale * 0.2 - bounce, scale * 0.35, 0.9);
    drawHeart(forehead.x, forehead.y - scale * 0.75, scale * 0.28, 0.75);
  }

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
  tick: number
) {
  const preset = getFaceFilterPreset(filterId);

  ctx.save();
  ctx.filter = preset.colorFilter === "none" ? "none" : preset.colorFilter;
  ctx.drawImage(source, 0, 0, w, h);
  ctx.restore();

  if (filterId === "none") return;

  drawFaceBeauty(ctx, source, landmarkerResult, w, h, preset.beauty);
  if (preset.blush) drawBlush(ctx, landmarkerResult, w, h, preset.blush);

  if (preset.mask3d) {
    drawFaceMask3d(ctx, landmarkerResult, w, h, preset.mask3d, tick);
  } else {
    drawOverlay(ctx, landmarkerResult, w, h, filterId, tick);
  }
}
