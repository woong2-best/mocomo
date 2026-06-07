import { FACE_OVAL_INDICES } from "@/lib/face-filters/presets";

export type FaceMask3dId = "dog-face" | "cat-face" | "bear-face" | "clown-face" | "fox-face";

const SIZE = 512;
const cache = new Map<FaceMask3dId, HTMLCanvasElement>();

/** 마스크 텍스처와 맞춘 표준 얼굴 랜드마크 UV (0~1) */
const templateCache = new Map<number, { u: number; v: number }>();

function buildTemplatePoints() {
  if (templateCache.size > 0) return;
  const cx = 0.5;
  const cy = 0.52;
  const rx = 0.36;
  const ry = 0.42;

  FACE_OVAL_INDICES.forEach((idx, i) => {
    const t = (i / FACE_OVAL_INDICES.length) * Math.PI * 2;
    templateCache.set(idx, {
      u: cx + Math.cos(t) * rx,
      v: cy + Math.sin(t) * ry * 1.05,
    });
  });

  const extras: [number, number, number][] = [
    [1, 0.5, 0.54],
    [10, 0.5, 0.22],
    [152, 0.5, 0.88],
    [33, 0.36, 0.46],
    [133, 0.4, 0.46],
    [263, 0.64, 0.46],
    [362, 0.6, 0.46],
    [61, 0.42, 0.62],
    [291, 0.58, 0.62],
    [199, 0.5, 0.58],
    [4, 0.5, 0.5],
    [234, 0.18, 0.48],
    [454, 0.82, 0.48],
  ];
  for (const [idx, u, v] of extras) templateCache.set(idx, { u, v });
}

export function getMaskTemplatePoint(index: number): { u: number; v: number } {
  buildTemplatePoints();
  return templateCache.get(index) ?? { u: 0.5, v: 0.5 };
}

function roundFace(ctx: CanvasRenderingContext2D, color: string) {
  const g = ctx.createRadialGradient(256, 270, 40, 256, 270, 210);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(256, 270, 185, 220, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCartoonEyes(ctx: CanvasRenderingContext2D, y: number, gap: number) {
  for (const cx of [256 - gap, 256 + gap]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(cx, y, 38, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.ellipse(cx + 4, y + 2, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx + 10, y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintDogFace(ctx: CanvasRenderingContext2D) {
  roundFace(ctx, "#d4a574");
  ctx.fillStyle = "#c4935f";
  ctx.beginPath();
  ctx.ellipse(256, 310, 95, 75, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCartoonEyes(ctx, 230, 72);
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.ellipse(256, 318, 34, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(248, 312, 8, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8b6914";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 355, 22, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = "#ff8a80";
  ctx.beginPath();
  ctx.ellipse(256, 358, 16, 11, 0, 0, Math.PI);
  ctx.fill();
}

function paintCatFace(ctx: CanvasRenderingContext2D) {
  roundFace(ctx, "#b0bec5");
  ctx.fillStyle = "#ff8a65";
  ctx.beginPath();
  ctx.moveTo(256, 300);
  ctx.lineTo(236, 330);
  ctx.lineTo(276, 330);
  ctx.closePath();
  ctx.fill();
  drawCartoonEyes(ctx, 228, 68);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(256 + side * 55, 300 + j * 10);
      ctx.lineTo(256 + side * 120, 290 + j * 14);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#f48fb1";
  ctx.beginPath();
  ctx.moveTo(256, 312);
  ctx.lineTo(246, 322);
  ctx.lineTo(266, 322);
  ctx.closePath();
  ctx.fill();
}

function paintBearFace(ctx: CanvasRenderingContext2D) {
  roundFace(ctx, "#a1887f");
  ctx.fillStyle = "#8d6e63";
  ctx.beginPath();
  ctx.ellipse(256, 315, 80, 65, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCartoonEyes(ctx, 232, 70);
  ctx.fillStyle = "#4e342e";
  ctx.beginPath();
  ctx.ellipse(256, 320, 30, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6d4c41";
  ctx.beginPath();
  ctx.ellipse(256, 352, 40, 22, 0, 0, Math.PI);
  ctx.fill();
}

function paintClownFace(ctx: CanvasRenderingContext2D) {
  roundFace(ctx, "#fff8e1");
  drawCartoonEyes(ctx, 228, 70);
  ctx.fillStyle = "#42a5f5";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(256 + side * 55, 210);
    ctx.lineTo(256 + side * 95, 250);
    ctx.lineTo(256 + side * 35, 255);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.arc(256, 318, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(248, 310, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c62828";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(256, 365, 55, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
}

function paintFoxFace(ctx: CanvasRenderingContext2D) {
  roundFace(ctx, "#ff8f00");
  ctx.fillStyle = "#fff3e0";
  ctx.beginPath();
  ctx.ellipse(256, 310, 75, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCartoonEyes(ctx, 226, 66);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(256, 300);
  ctx.lineTo(244, 318);
  ctx.lineTo(268, 318);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2e2e2e";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(256 + side * 20, 340);
    ctx.lineTo(256 + side * 8, 365);
    ctx.lineTo(256 + side * 32, 360);
    ctx.closePath();
    ctx.fill();
  }
}

const painters: Record<FaceMask3dId, (ctx: CanvasRenderingContext2D) => void> = {
  "dog-face": paintDogFace,
  "cat-face": paintCatFace,
  "bear-face": paintBearFace,
  "clown-face": paintClownFace,
  "fox-face": paintFoxFace,
};

export function getMaskTexture(id: FaceMask3dId): HTMLCanvasElement {
  buildTemplatePoints();
  const hit = cache.get(id);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, SIZE, SIZE);
  painters[id](ctx);
  cache.set(id, canvas);
  return canvas;
}
