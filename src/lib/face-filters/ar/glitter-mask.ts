import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { FACE_OVAL_INDICES } from "@/lib/face-filters/presets";
import { landmarkPt } from "@/lib/face-filters/face-coords";

type Pt = { x: number; y: number };

function faceOvalPts(result: FaceLandmarkerResult, w: number, h: number): Pt[] {
  return FACE_OVAL_INDICES.map((i) => landmarkPt(result, i, w, h)).filter(Boolean) as Pt[];
}

function pointInPolygon(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 얼굴 전체 글리터 마스크 — 인스타 스파클 */
export function drawFaceGlitterMask(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  intensity: number,
  tick: number,
  tint = "#FFFFFF"
) {
  if (intensity <= 0) return;
  const oval = faceOvalPts(result, w, h);
  if (oval.length < 8) return;

  const density = Math.floor(w * h * 0.00012 * intensity);
  const seed = Math.floor(tick / 50);

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let i = 0; i < density; i++) {
    const hash = (i * 73856093 + seed * 19349663) >>> 0;
    const px = (hash % 10000) / 10000;
    const py = ((hash >> 8) % 10000) / 10000;
    const x = px * w;
    const y = py * h;
    if (!pointInPolygon(x, y, oval)) continue;

    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(tick * 0.008 + i * 0.7));
    const size = 0.6 + (i % 4) * 0.35;
    const alpha = intensity * twinkle * (0.4 + (i % 3) * 0.2);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (i % 5 === 0 && twinkle > 0.7) {
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
      ctx.lineWidth = 0.5;
      ctx.lineCap = "round";
      const len = size * 2.5;
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI * 2 + tick * 0.001;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * len * 0.15, y + Math.sin(ang) * len * 0.15);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}
