import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { lm } from "@/lib/face-filters/ar/geometry";
import { LEFT_EYE_INDICES, RIGHT_EYE_INDICES } from "@/lib/face-filters/presets";

function tortoisePattern(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#8B5E3C";
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 12; i++) {
    const px = x + ((i * 47) % 100) / 100 * w;
    const py = y + ((i * 83) % 100) / 100 * h;
    ctx.fillStyle = i % 2 === 0 ? "#5C3D1E" : "#A0714A";
    ctx.beginPath();
    ctx.ellipse(px, py, w * 0.12, h * 0.1, i * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLens(
  ctx: CanvasRenderingContext2D,
  face: FaceArContext,
  indices: readonly number[],
  roll: number
) {
  const pts = indices
    .map((i) => lm(face.result, i, face.w, face.h, face.mirrored))
    .filter(Boolean) as { x: number; y: number }[];
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

  const pad = face.scale * 0.14;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rw = maxX - minX + pad * 2;
  const rh = maxY - minY + pad * 2;
  const lensR = Math.max(rw, rh) * 0.52;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(roll * 0.15);

  tortoisePattern(ctx, -lensR, -lensR * 0.85, lensR * 2, lensR * 1.7);

  ctx.strokeStyle = "#C4885F";
  ctx.lineWidth = Math.max(2, face.scale * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, 0, lensR, lensR * 0.88, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(176,184,192,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 0, lensR * 0.88, lensR * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();

  const envY = Math.sin(face.tick * 0.002) * lensR * 0.15;
  const envG = ctx.createLinearGradient(-lensR, -lensR + envY, lensR, lensR + envY);
  envG.addColorStop(0, "rgba(255,255,255,0.22)");
  envG.addColorStop(0.5, "rgba(255,255,255,0)");
  envG.addColorStop(1, "rgba(255,255,255,0.12)");
  ctx.fillStyle = envG;
  ctx.beginPath();
  ctx.ellipse(0, 0, lensR * 0.82, lensR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,100,150,0.35)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, lensR * 0.92, lensR * 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#B0B8C0";
  ctx.beginPath();
  ctx.ellipse(lensR * 0.95, 0, face.scale * 0.04, face.scale * 0.025, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return { cx, cy, lensR };
}

/** Oversized acetate glasses — CHIC · OVERSIZED */
export function drawGlassesOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const roll = face.pose?.roll ?? 0;
  const left = drawLens(ctx, face, LEFT_EYE_INDICES, roll);
  const right = drawLens(ctx, face, RIGHT_EYE_INDICES, roll);
  if (!left || !right) return;

  ctx.save();
  ctx.strokeStyle = "#8B5E3C";
  ctx.lineWidth = Math.max(2.5, face.scale * 0.05);
  ctx.beginPath();
  ctx.moveTo(left.cx + left.lensR * 0.85, left.cy);
  ctx.lineTo(right.cx - right.lensR * 0.85, right.cy);
  ctx.stroke();

  const padY = face.nose.y + face.scale * 0.02;
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#B0B8C0";
    ctx.beginPath();
    ctx.ellipse(face.nose.x + side * face.scale * 0.06, padY, face.scale * 0.04, face.scale * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const [temple, dir] of [
    [face.leftTemple, -1],
    [face.rightTemple, 1],
  ] as const) {
    ctx.strokeStyle = "#8B5E3C";
    ctx.lineWidth = Math.max(2, face.scale * 0.045);
    ctx.beginPath();
    ctx.moveTo(temple.x + dir * face.scale * 0.05, temple.y);
    ctx.quadraticCurveTo(
      temple.x + dir * face.scale * 0.35,
      temple.y - face.scale * 0.05,
      temple.x + dir * face.scale * 0.55,
      temple.y + face.scale * 0.02
    );
    ctx.stroke();
  }
  ctx.restore();
}
